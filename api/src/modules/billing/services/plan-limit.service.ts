import { ForbiddenException, Injectable } from '@nestjs/common';
import { CallKind, OrgRole } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import {
  PlanErrorCodes,
  PlanFeature,
  PlanFeatures,
  PlanLimits,
} from '@/shared/config/plans/plans.config';
import { EntitlementsService } from './entitlements.service';
import { Entitlements, MinutesKind } from '../interfaces/entitlements.interface';
import {
  nextPlanFor,
  planFeatureLocked,
  planLimitReached,
  raisesLimit,
  subscriptionRequired,
} from '../utils/plan-errors.utils';

export interface CallAllowance {
  // Fixed at start: the call may run through the pool and cap allowance, then on personal credits, up to the
  // prospect's own time limit. null = no limit.
  max_duration_seconds: number | null;
}

// Assert helpers used on every create / start / upload / invite path (§8.2). Limits are read from the
// effective AppConfig plan definitions, never hardcoded.
@Injectable()
export class PlanLimitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async assertWritable(ctx: OrgContext): Promise<Entitlements> {
    const entitlements = await this.entitlements.getEntitlements(ctx.organisationId);
    if (entitlements.read_only)
      throw subscriptionRequired(entitlements.plan, entitlements.status);
    return entitlements;
  }

  async assertFeature(ctx: OrgContext, feature: PlanFeature): Promise<Entitlements> {
    const entitlements = await this.entitlements.getEntitlements(ctx.organisationId);
    if (!entitlements.features[feature])
      throw planFeatureLocked(
        feature,
        entitlements.plan,
        nextPlanFor(entitlements.plan, this.definitions(), (d) => d.features[feature]),
      );
    return entitlements;
  }

  async hasFeature(organisationId: string, feature: PlanFeature): Promise<boolean> {
    const entitlements = await this.entitlements.getEntitlements(organisationId);
    return entitlements.features[feature];
  }

  async assertCanCreateCopilot(ctx: OrgContext, adding = 1) {
    const entitlements = await this.assertWritable(ctx);
    const consumption = await this.entitlements.getConsumption(ctx.organisationId, {
      fresh: true,
    });
    this.assertCount(
      entitlements,
      PlanLimits.COPILOTS_MAX,
      consumption.copilots,
      adding,
      'Your plan’s co-pilot limit is reached. Archive one or upgrade to add more.',
    );
  }

  async assertCanCreatePracticeProspect(ctx: OrgContext, adding = 1) {
    const entitlements = await this.assertWritable(ctx);
    const consumption = await this.entitlements.getConsumption(ctx.organisationId, {
      fresh: true,
    });
    this.assertCount(
      entitlements,
      PlanLimits.PRACTICE_PROSPECTS_MAX,
      consumption.practice_prospects,
      adding,
      'Your plan’s practice prospect limit is reached. Archive one or upgrade to add more.',
    );

    // Non-owners are also limited per person (counts the non-archived prospects they authored, §10.1h).
    const perMember = entitlements.limits.practice_prospects_per_member_max;
    if (perMember != null && ctx.role !== OrgRole.OWNER) {
      const own = await this.prisma.practiceAgent.count({
        where: {
          organisation_id: ctx.organisationId,
          user_id: ctx.userId,
          archived_at: null,
        },
      });
      if (own + adding > perMember)
        throw planLimitReached({
          limit: PlanLimits.PRACTICE_PROSPECTS_PER_MEMBER_MAX,
          current: own,
          max: perMember,
          plan: entitlements.plan,
          next_plan: null,
          message:
            'You have reached the number of practice prospects you can create. Archive one of yours to add another.',
        });
    }
  }

  // Returns the maximum duration for a new call (§8.3). Throws when no minutes are left.
  async assertCanStartCall(
    ctx: OrgContext,
    kind: MinutesKind,
    prospectTimeLimitMinutes?: number | null,
  ): Promise<CallAllowance> {
    const entitlements = await this.assertWritable(ctx);
    const availability = await this.entitlements.getAvailability(
      ctx.organisationId,
      ctx.userId,
      kind,
      { fresh: true },
    );
    if (availability.total_seconds < 1) this.throwMinutes(entitlements, kind, availability.limited_by);

    const limits = [
      availability.total_seconds,
      prospectTimeLimitMinutes ? prospectTimeLimitMinutes * 60 : Infinity,
    ];
    const max = Math.min(...limits);
    return { max_duration_seconds: Number.isFinite(max) ? Math.floor(max) : null };
  }

  // Before an upload is accepted: within the uploads quota and with some live minutes left.
  async assertCanUpload(ctx: OrgContext) {
    const entitlements = await this.assertWritable(ctx);
    const consumption = await this.entitlements.getConsumption(ctx.organisationId, {
      fresh: true,
    });
    this.assertCount(
      entitlements,
      PlanLimits.UPLOADS_PER_PERIOD,
      consumption.uploads,
      1,
      'Your plan’s upload limit for this period is reached.',
    );
    const availability = await this.entitlements.getAvailability(
      ctx.organisationId,
      ctx.userId,
      CallKind.LIVE,
    );
    if (availability.total_seconds < 1)
      this.throwMinutes(entitlements, CallKind.LIVE, availability.limited_by);
  }

  // After the duration probe of an upload, before any transcription cost is incurred (§14).
  async uploadFitsRemainingMinutes(
    organisationId: string,
    userId: string,
    durationSeconds: number,
  ): Promise<{ fits: boolean; available_seconds: number }> {
    const availability = await this.entitlements.getAvailability(
      organisationId,
      userId,
      CallKind.LIVE,
      { fresh: true },
    );
    return {
      fits: durationSeconds <= availability.total_seconds,
      available_seconds: availability.total_seconds,
    };
  }

  // Members plus pending invitations must stay within the seats (§8.2).
  async assertCanInvite(ctx: OrgContext, adding = 1) {
    const entitlements = await this.assertWritable(ctx);
    await this.assertFeature(ctx, PlanFeatures.ORG_INVITATIONS);
    const [members, pending] = await Promise.all([
      this.prisma.membership.count({ where: { organisation_id: ctx.organisationId } }),
      this.prisma.invitation.count({
        where: {
          organisation_id: ctx.organisationId,
          status: 'PENDING',
          expires_at: { gt: new Date() },
        },
      }),
    ]);
    const used = members + pending;
    if (used + adding > entitlements.seats_total)
      throw planLimitReached({
        limit: PlanLimits.SEATS_INCLUDED,
        current: used,
        max: entitlements.seats_total,
        plan: entitlements.plan,
        next_plan: entitlements.limits.extra_seats_allowed
          ? null
          : nextPlanFor(entitlements.plan, this.definitions(), (d) => d.limits.extra_seats_allowed),
        extra_seats_allowed: entitlements.limits.extra_seats_allowed,
        message: entitlements.limits.extra_seats_allowed
          ? 'All seats are in use. Add seats to invite more people.'
          : 'Your plan does not include more seats.',
      });
  }

  private assertCount(
    entitlements: Entitlements,
    limit:
      | typeof PlanLimits.COPILOTS_MAX
      | typeof PlanLimits.PRACTICE_PROSPECTS_MAX
      | typeof PlanLimits.UPLOADS_PER_PERIOD,
    current: number,
    adding: number,
    message: string,
  ) {
    const max = entitlements.limits[limit];
    // Lowering a limit never removes items: only creating new ones is blocked (§8.2).
    if (max == null || current + adding <= max) return;
    throw planLimitReached({
      limit,
      current,
      max,
      plan: entitlements.plan,
      next_plan: nextPlanFor(entitlements.plan, this.definitions(), raisesLimit(limit, max)),
      message,
    });
  }

  private throwMinutes(
    entitlements: Entitlements,
    kind: MinutesKind,
    limitedBy: 'pool' | 'member_cap' | null,
  ): never {
    const isLive = kind === CallKind.LIVE || entitlements.limits.practice_shares_live_pool;
    const limit =
      limitedBy === 'member_cap'
        ? isLive
          ? PlanLimits.LIVE_MINUTES_PER_MEMBER
          : PlanLimits.PRACTICE_MINUTES_PER_MEMBER
        : isLive
          ? PlanLimits.LIVE_MINUTES
          : PlanLimits.PRACTICE_MINUTES;
    const max = entitlements.limits[limit];
    throw planLimitReached({
      limit,
      current: max ?? 0,
      max,
      plan: entitlements.plan,
      next_plan:
        limitedBy === 'member_cap'
          ? null
          : nextPlanFor(entitlements.plan, this.definitions(), raisesLimit(limit, max)),
      kind,
      // Everyone on a paid plan can buy personal minutes, with no coach involvement (§2.4).
      can_buy_minutes: entitlements.features.topup_purchases && !entitlements.read_only,
      message:
        limitedBy === 'member_cap'
          ? 'You have used your share of the plan’s minutes for this period.'
          : 'No minutes are left in this period.',
    });
  }

  private definitions() {
    return this.appConfig.get('plans.definitions');
  }
}

export const isPlanError = (error: unknown): boolean => {
  if (!(error instanceof ForbiddenException)) return false;
  const code = (error.getResponse() as { code?: string })?.code;
  return (
    code === PlanErrorCodes.PLAN_LIMIT_REACHED ||
    code === PlanErrorCodes.PLAN_FEATURE_LOCKED ||
    code === PlanErrorCodes.SUBSCRIPTION_REQUIRED
  );
};

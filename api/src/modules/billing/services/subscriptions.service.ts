import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import {
  PlanKey,
  Prisma,
  Subscription,
  SubscriptionEventType,
  SubscriptionSource,
  SubscriptionStatus,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { EntitlementsService } from './entitlements.service';

type Db = Prisma.TransactionClient | PrismaService;

export type ActorKind = 'USER' | 'ADMIN' | 'STRIPE' | 'SYSTEM';

export interface SubscriptionEventInput {
  organisationId: string;
  type: SubscriptionEventType;
  fromPlan?: PlanKey | null;
  toPlan?: PlanKey | null;
  actorKind: ActorKind;
  actorId?: string | null;
  note?: string | null;
  // Reasons, amounts and ids only; never display text.
  data?: Record<string, unknown>;
}

export interface AssignManualPlanInput {
  plan: PlanKey;
  extraSeats?: number;
  periodEnd?: Date | null;
  note: string;
}

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly entitlements: EntitlementsService,
  ) {}

  findByOrganisation(organisationId: string) {
    return this.prisma.subscription.findUnique({
      where: { organisation_id: organisationId },
    });
  }

  async recordEvent(input: SubscriptionEventInput, db: Db = this.prisma) {
    return db.subscriptionEvent.create({
      data: {
        organisation_id: input.organisationId,
        type: input.type,
        from_plan: input.fromPlan ?? null,
        to_plan: input.toPlan ?? null,
        actor_kind: input.actorKind,
        actor_id: input.actorId ?? null,
        note: input.note ?? null,
        data: (input.data ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  // Each owner gets one TRIAL across every organisation they create (§8.5). A later organisation starts
  // without a subscription (read-only) and is offered a paid plan instead.
  async createForNewOrganisation(
    organisationId: string,
    ownerId: string,
    db: Db = this.prisma,
  ): Promise<Subscription | null> {
    const claimed = await db.user.updateMany({
      where: { id: ownerId, trial_used_at: null },
      data: { trial_used_at: new Date() },
    });
    if (!claimed.count) return null;

    const trialDays =
      this.appConfig.get('plans.definitions').TRIAL.limits.trial_days ?? 14;
    const now = new Date();
    const endsAt = DateTime.fromJSDate(now).plus({ days: trialDays }).toJSDate();
    const subscription = await db.subscription.create({
      data: {
        organisation_id: organisationId,
        plan: PlanKey.TRIAL,
        status: SubscriptionStatus.TRIALING,
        source: SubscriptionSource.MANUAL,
        current_period_start: now,
        current_period_end: endsAt,
        trial_ends_at: endsAt,
      },
    });
    await this.recordEvent(
      {
        organisationId,
        type: SubscriptionEventType.TRIAL_STARTED,
        toPlan: PlanKey.TRIAL,
        actorKind: 'SYSTEM',
        data: { trial_days: trialDays },
      },
      db,
    );
    return subscription;
  }

  // Platform admins grant plans by hand (e.g. the first coaches for free, §10.3). Stripe-managed plans are not
  // changed here, so the database and Stripe never disagree (§11b).
  async assignManual(
    organisationId: string,
    input: AssignManualPlanInput,
    adminId: string,
  ) {
    const organisation = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      include: { subscription: true },
    });
    if (!organisation) throw new NotFoundException('Organisation not found');
    const current = organisation.subscription;
    if (
      current?.source === SubscriptionSource.STRIPE &&
      current.status !== SubscriptionStatus.CANCELED
    )
      throw new BadRequestException({
        message:
          'This organisation pays through Stripe. Cancel the Stripe subscription before assigning a manual plan.',
        code: 'SUBSCRIPTION_MANAGED_BY_STRIPE',
      });
    if (input.plan === PlanKey.TRIAL)
      throw new BadRequestException('Use "extend trial" for trials');

    const definition = this.appConfig.get('plans.definitions')[input.plan];
    const extraSeats = definition.limits.extra_seats_allowed
      ? Math.max(0, input.extraSeats ?? 0)
      : 0;
    const now = new Date();
    const periodEnd =
      input.periodEnd ?? DateTime.fromJSDate(now).plus({ years: 1 }).toJSDate();
    if (periodEnd <= now)
      throw new BadRequestException('The period end must be in the future');

    const data = {
      plan: input.plan,
      status: SubscriptionStatus.ACTIVE,
      source: SubscriptionSource.MANUAL,
      extra_seats: extraSeats,
      current_period_start: now,
      current_period_end: periodEnd,
      trial_ends_at: null,
      cancel_at_period_end: false,
      past_due_since: null,
      canceled_at: null,
      manual_note: input.note,
      unit_amount_cents: 0,
    };
    const subscription = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.subscription.upsert({
        where: { organisation_id: organisationId },
        create: { organisation_id: organisationId, ...data },
        update: data,
      });
      await this.recordEvent(
        {
          organisationId,
          type: SubscriptionEventType.MANUAL_ASSIGNED,
          fromPlan: current?.plan ?? null,
          toPlan: input.plan,
          actorKind: 'ADMIN',
          actorId: adminId,
          note: input.note,
          data: { extra_seats: extraSeats, period_end: periodEnd.toISOString() },
        },
        tx,
      );
      return saved;
    });
    await this.entitlements.invalidate(organisationId);
    return subscription;
  }

  async extendTrial(organisationId: string, days: number, adminId: string, note?: string) {
    const current = await this.findByOrganisation(organisationId);
    if (!current) throw new NotFoundException('This organisation has no subscription');
    const isTrial =
      current.status === SubscriptionStatus.TRIALING ||
      (current.status === SubscriptionStatus.CANCELED && !!current.trial_ends_at);
    if (!isTrial) throw new BadRequestException('This organisation is not on a trial');

    const from = DateTime.max(
      DateTime.fromJSDate(current.trial_ends_at ?? current.current_period_end),
      DateTime.now(),
    );
    const endsAt = from.plus({ days }).toJSDate();
    const subscription = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.subscription.update({
        where: { organisation_id: organisationId },
        data: {
          status: SubscriptionStatus.TRIALING,
          trial_ends_at: endsAt,
          current_period_end: endsAt,
          canceled_at: null,
        },
      });
      await this.recordEvent(
        {
          organisationId,
          type: SubscriptionEventType.TRIAL_EXTENDED,
          fromPlan: current.plan,
          toPlan: current.plan,
          actorKind: 'ADMIN',
          actorId: adminId,
          note: note ?? null,
          data: { days, trial_ends_at: endsAt.toISOString() },
        },
        tx,
      );
      return saved;
    });
    await this.entitlements.invalidate(organisationId);
    return subscription;
  }
}

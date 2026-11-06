import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  CallKind,
  Prisma,
  SubscriptionEventType,
} from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { MIN_COUNTED_CALL_SECONDS } from '@/shared/config/plans/plans.config';
import { EntitlementsService } from './entitlements.service';
import { SubscriptionsService } from './subscriptions.service';
import { MinutesKind } from '../interfaces/entitlements.interface';
import { settleSeconds } from '../utils/allowance.utils';

type Tx = Prisma.TransactionClient;
type SecondsField = 'live_seconds_remaining' | 'practice_seconds_remaining';

export interface GrantCreditsInput {
  organisationId: string;
  // null = team pool, set = personal credit for that user in that organisation.
  userId?: string | null;
  liveMinutes: number;
  practiceMinutes: number;
  packId?: string | null;
  stripePaymentId?: string | null;
  grantedById?: string | null;
  note?: string | null;
}

// Rolling top-up credits (§3.5): purchases and admin grants that never expire, and the per-call settlement
// that draws them down after the plan allowance.
@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async grant(input: GrantCreditsInput, db: Tx | PrismaService = this.prisma) {
    const live = Math.round(Math.max(0, input.liveMinutes) * 60);
    const practice = Math.round(Math.max(0, input.practiceMinutes) * 60);
    if (!live && !practice)
      throw new BadRequestException('Grant at least one minute');

    if (input.userId) {
      const member = await db.membership.findUnique({
        where: {
          organisation_id_user_id: {
            organisation_id: input.organisationId,
            user_id: input.userId,
          },
        },
      });
      if (!member)
        throw new BadRequestException('That person is not a member of this organisation');
    }

    const credit = await db.usageCredit.create({
      data: {
        organisation_id: input.organisationId,
        user_id: input.userId ?? null,
        pack_id: input.packId ?? null,
        live_seconds_granted: live,
        practice_seconds_granted: practice,
        live_seconds_remaining: live,
        practice_seconds_remaining: practice,
        stripe_payment_id: input.stripePaymentId ?? null,
        granted_by_id: input.grantedById ?? null,
        note: input.note ?? null,
      },
    });
    await this.subscriptions.recordEvent(
      {
        organisationId: input.organisationId,
        type: SubscriptionEventType.CREDITS_GRANTED,
        actorKind: input.stripePaymentId ? 'STRIPE' : input.grantedById ? 'ADMIN' : 'SYSTEM',
        actorId: input.grantedById ?? null,
        note: input.note ?? null,
        data: {
          credit_id: credit.id,
          scope: input.userId ? 'personal' : 'team',
          // Personal purchases stay private: the user id is only kept on the credit row itself.
          live_minutes: input.liveMinutes,
          practice_minutes: input.practiceMinutes,
          pack_id: input.packId ?? null,
        },
      },
      db,
    );
    await this.entitlements.invalidate(input.organisationId);
    return credit;
  }

  async balances(organisationId: string, userId?: string) {
    const [team, personal] = await Promise.all([
      this.prisma.usageCredit.aggregate({
        where: { organisation_id: organisationId, user_id: null },
        _sum: { live_seconds_remaining: true, practice_seconds_remaining: true },
      }),
      userId
        ? this.entitlements.personalCreditSeconds(organisationId, userId)
        : Promise.resolve(null),
    ]);
    return {
      team: {
        live_minutes: (team._sum.live_seconds_remaining ?? 0) / 60,
        practice_minutes: (team._sum.practice_seconds_remaining ?? 0) / 60,
      },
      personal: personal
        ? { live_minutes: personal.live / 60, practice_minutes: personal.practice / 60 }
        : null,
    };
  }

  // Called once a call's duration is final: live and practice calls at the end, uploads after transcription.
  // Idempotent: the call row is claimed first, so a second run does nothing.
  async settleCall(callId: string): Promise<void> {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      select: {
        id: true,
        organisation_id: true,
        user_id: true,
        kind: true,
        duration_seconds: true,
        usage_settled_at: true,
        _count: { select: { segments: true } },
      },
    });
    if (!call || call.usage_settled_at) return;

    // Misclicks and calls that failed before producing a transcript never count (§8.3, §14).
    const counted =
      call.duration_seconds >= MIN_COUNTED_CALL_SECONDS && call._count.segments > 0
        ? call.duration_seconds
        : 0;

    const kind = call.kind as MinutesKind;
    const [entitlements, consumption, personal] = await Promise.all([
      this.entitlements.getEntitlements(call.organisation_id),
      this.entitlements.getConsumption(call.organisation_id, { fresh: true }),
      this.entitlements.personalCreditSeconds(call.organisation_id, call.user_id),
    ]);
    // The call is not settled yet, so it is not part of the consumption: this is "before the call".
    const availability = this.entitlements.computeAvailability(
      entitlements,
      consumption,
      call.user_id,
      kind,
      personal,
    );
    const settlement = settleSeconds({
      callSeconds: counted,
      availableBefore: availability.pool_seconds,
      planAllowanceLeftBefore: this.entitlements.planAllowanceLeft(
        entitlements,
        consumption,
        kind,
      ),
      personalCreditSeconds: availability.personal_credit_seconds,
    });
    const creditKind = this.entitlements.creditKind(entitlements, kind);

    try {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.call.updateMany({
          where: { id: callId, usage_settled_at: null },
          data: { usage_settled_at: new Date(), counted_seconds: counted },
        });
        if (!claimed.count) throw new AlreadySettled();

        const fromTeam = await this.drawDown(tx, {
          organisationId: call.organisation_id,
          userId: null,
          kind: creditKind,
          seconds: settlement.fromTeamCredits,
          callId,
        });
        const fromPersonal = await this.drawDown(tx, {
          organisationId: call.organisation_id,
          userId: call.user_id,
          kind: creditKind,
          seconds: settlement.fromPersonalCredits,
          callId,
        });
        if (fromPersonal)
          await tx.call.update({
            where: { id: callId },
            data: { personal_credit_seconds: fromPersonal },
          });

        const shortfall =
          settlement.overrun +
          (settlement.fromTeamCredits - fromTeam) +
          (settlement.fromPersonalCredits - fromPersonal);
        if (shortfall > 0)
          this.logger.warn(
            `Call ${callId}: soft overrun of ${shortfall}s (concurrent calls); not charged`,
          );
      });
    } catch (error) {
      if (error instanceof AlreadySettled) return;
      throw error;
    }
    await this.entitlements.invalidate(call.organisation_id);
  }

  // A refunded or charged-back purchase (§11, §14): the remaining balance is zeroed; seconds already used are
  // not clawed back.
  async zeroCreditForPayment(stripePaymentId: string) {
    const credit = await this.prisma.usageCredit.findUnique({
      where: { stripe_payment_id: stripePaymentId },
    });
    if (!credit) return null;
    await this.prisma.usageCredit.update({
      where: { id: credit.id },
      data: { live_seconds_remaining: 0, practice_seconds_remaining: 0 },
    });
    await this.entitlements.invalidate(credit.organisation_id);
    return credit;
  }

  // Oldest credit first (FIFO). Conditional decrements make concurrent settlements safe without row locks:
  // a decrement that would go below zero matches no row and the loop re-reads the balance.
  private async drawDown(
    tx: Tx,
    input: {
      organisationId: string;
      userId: string | null;
      kind: MinutesKind;
      seconds: number;
      callId: string;
    },
  ): Promise<number> {
    let remaining = Math.round(input.seconds);
    if (remaining <= 0) return 0;
    const field: SecondsField =
      input.kind === CallKind.LIVE ? 'live_seconds_remaining' : 'practice_seconds_remaining';
    let drawn = 0;

    for (let attempt = 0; attempt < 5 && remaining > 0; attempt += 1) {
      const credits = await tx.usageCredit.findMany({
        where: {
          organisation_id: input.organisationId,
          user_id: input.userId,
          [field]: { gt: 0 },
        },
        orderBy: { created_at: 'asc' },
      });
      if (!credits.length) break;

      for (const credit of credits) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, credit[field]);
        const updated = await tx.usageCredit.updateMany({
          where: { id: credit.id, [field]: { gte: take } },
          data: { [field]: { decrement: take } },
        });
        if (!updated.count) continue;
        await tx.usageCreditConsumption.create({
          data: {
            credit_id: credit.id,
            call_id: input.callId,
            live_seconds: field === 'live_seconds_remaining' ? take : 0,
            practice_seconds: field === 'practice_seconds_remaining' ? take : 0,
          },
        });
        remaining -= take;
        drawn += take;
      }
    }
    return drawn;
  }
}

class AlreadySettled extends Error {}

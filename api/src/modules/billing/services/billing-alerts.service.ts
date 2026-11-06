import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType, OrgRole } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { ResendMailService } from '@/integrations/notifications/resend/services/mail.service';
import { EmailConfig } from '@/shared/constants/email';

export const BillingAlertKinds = {
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  TRIAL_ENDING: 'TRIAL_ENDING',
  PAYMENT_ACTION_REQUIRED: 'PAYMENT_ACTION_REQUIRED',
  PLAN_CANCELED: 'PLAN_CANCELED',
} as const;
export type BillingAlertKind =
  (typeof BillingAlertKinds)[keyof typeof BillingAlertKinds];

const EMAILED: BillingAlertKind[] = [
  BillingAlertKinds.PAYMENT_FAILED,
  BillingAlertKinds.TRIAL_ENDING,
];

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// BILLING_ALERT bell notifications to the organisation's owners, plus an email for payment failures and
// trials about to end (§11a "Banners and alerts"). Best effort: never breaks the caller.
@Injectable()
export class BillingAlertsService {
  private readonly logger = new Logger(BillingAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: ResendMailService,
    private readonly config: ConfigService,
  ) {}

  async alert(
    organisationId: string,
    kind: BillingAlertKind,
    params: Record<string, unknown> = {},
    dedupeKey?: string,
  ) {
    try {
      const owners = await this.prisma.membership.findMany({
        where: { organisation_id: organisationId, role: OrgRole.OWNER },
        include: { user: { select: { id: true, email: true } } },
      });
      if (!owners.length) return;
      await this.notifications.create({
        organisationId,
        userIds: owners.map((owner) => owner.user_id),
        type: NotificationType.BILLING_ALERT,
        params: { kind, ...params },
        dedupeKey: dedupeKey ?? null,
      });
      if (EMAILED.includes(kind))
        await this.email(
          organisationId,
          owners.map((owner) => owner.user.email),
          kind,
          params,
        );
    } catch (error) {
      this.logger.warn(`Billing alert ${kind} for ${organisationId} failed: ${error?.message}`);
    }
  }

  private async email(
    organisationId: string,
    to: string[],
    kind: BillingAlertKind,
    params: Record<string, unknown>,
  ) {
    const organisation = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { name: true },
    });
    const name = escapeHtml(organisation?.name ?? 'your organisation');
    const url = `${(this.config.get<string>('APP_URL') ?? '').replace(/\/$/, '')}/settings/billing`;
    const content =
      kind === BillingAlertKinds.PAYMENT_FAILED
        ? {
            subject: `Payment failed for ${organisation?.name ?? 'your CallZen plan'}`,
            body: `We could not take the payment for <strong>${name}</strong>. Update your payment method to keep your plan active.`,
          }
        : {
            subject: `Your CallZen trial ends soon`,
            body: `The trial of <strong>${name}</strong> ends on ${escapeHtml(String(params.trial_ends_at ?? '').slice(0, 10))}. Choose a plan to keep creating calls and practice sessions. Your history stays available.`,
          };
    await Promise.all(
      to.map((email) =>
        this.mail
          .sendEmail({
            to: email,
            from: EmailConfig.email_addresses.alert,
            subject: content.subject,
            html: `<p>${content.body}</p><p><a href="${url}">Open billing</a></p>`,
          })
          .catch((error) =>
            this.logger.warn(`Billing email to ${email} failed: ${error?.message}`),
          ),
      ),
    );
  }
}

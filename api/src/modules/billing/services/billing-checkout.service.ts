import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrgRole, PlanKey } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { StripeBillingService } from '@/integrations/stripe/services/stripe-billing.service';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { PAID_PLANS, PaidPlanKey } from '@/shared/config/plans/plans.config';
import { EntitlementsService } from './entitlements.service';
import {
  BillingInterval,
  canBuyTopup,
  canManageBilling,
  TopupScope,
} from '../utils/stripe-billing.utils';

export const BillingErrorCodes = {
  BILLING_FORBIDDEN: 'BILLING_FORBIDDEN',
  PRICE_NOT_CONFIGURED: 'PRICE_NOT_CONFIGURED',
  TOPUPS_NOT_AVAILABLE: 'TOPUPS_NOT_AVAILABLE',
  ALREADY_SUBSCRIBED: 'ALREADY_SUBSCRIBED',
  NO_STRIPE_CUSTOMER: 'NO_STRIPE_CUSTOMER',
  SEATS_IN_USE: 'SEATS_IN_USE',
  NO_SUBSCRIPTION: 'NO_SUBSCRIPTION',
} as const;

// Checkout (new subscriptions), top-up purchases and the Customer Portal (payment details only, §11).
@Injectable()
export class BillingCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly stripe: StripeBillingService,
    private readonly entitlements: EntitlementsService,
    private readonly config: ConfigService,
  ) {}

  appUrl(path: string) {
    return `${(this.config.get<string>('APP_URL') ?? '').replace(/\/$/, '')}${path}`;
  }

  assertCanManage(ctx: OrgContext) {
    if (!canManageBilling(ctx))
      throw new ForbiddenException({
        message: 'Only the owner or someone with billing access can change the plan',
        code: BillingErrorCodes.BILLING_FORBIDDEN,
      });
  }

  // Stripe price ids for a plan, interval and seats; throws when the environment is not set up.
  lineItems(plan: PlanKey, interval: BillingInterval, extraSeats = 0) {
    if (!PAID_PLANS.includes(plan as PaidPlanKey))
      throw new BadRequestException('Choose a paid plan');
    const ids = this.appConfig.get('plans.stripe_prices')[plan as PaidPlanKey] as Record<string, string>;
    const base = interval === 'year' ? ids.yearly : ids.monthly;
    const seatPrice = interval === 'year' ? ids.extra_seat_yearly : ids.extra_seat_monthly;
    const definition = this.appConfig.get('plans.definitions')[plan];
    const seats = definition.limits.extra_seats_allowed ? Math.max(0, extraSeats) : 0;
    if (!base || (seats && !seatPrice))
      throw new BadRequestException({
        message: 'This plan cannot be bought yet. Please contact us.',
        code: BillingErrorCodes.PRICE_NOT_CONFIGURED,
      });
    return [
      { price: base, quantity: 1 },
      ...(seats ? [{ price: seatPrice, quantity: seats }] : []),
    ];
  }

  async ensureOrganisationCustomer(organisationId: string): Promise<string> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organisation_id: organisationId },
    });
    if (subscription?.stripe_customer_id) return subscription.stripe_customer_id;

    const organisation = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      include: {
        memberships: {
          where: { role: OrgRole.OWNER },
          orderBy: { created_at: 'asc' },
          take: 1,
          include: { user: { select: { email: true, full_name: true } } },
        },
      },
    });
    if (!organisation) throw new NotFoundException('Organisation not found');
    const owner = organisation.memberships[0]?.user;
    const customer = await this.stripe.createCustomer(
      {
        name: organisation.name,
        email: owner?.email,
        metadata: { organisation_id: organisationId },
      },
      `org-customer-${organisationId}`,
    );
    // Organisations without a subscription row get the customer linked when the checkout webhook arrives.
    if (subscription)
      await this.prisma.subscription.update({
        where: { organisation_id: organisationId },
        data: { stripe_customer_id: customer.id },
      });
    return customer.id;
  }

  // A person's own customer, for personal top-ups: their card and invoices stay theirs (§11).
  async ensureUserCustomer(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.stripe_customer_id) return user.stripe_customer_id;
    const customer = await this.stripe.createCustomer(
      {
        email: user.email,
        name: user.full_name ?? undefined,
        metadata: { user_id: userId },
      },
      `user-customer-${userId}`,
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { stripe_customer_id: customer.id },
    });
    return customer.id;
  }

  async checkout(
    ctx: OrgContext,
    input: { plan: PlanKey; interval: BillingInterval; extra_seats?: number },
    idempotencyKey?: string,
  ) {
    this.assertCanManage(ctx);
    const subscription = await this.prisma.subscription.findUnique({
      where: { organisation_id: ctx.organisationId },
    });
    if (
      subscription?.stripe_subscription_id &&
      subscription.status !== 'CANCELED'
    )
      throw new BadRequestException({
        message: 'This organisation already has a paid plan. Change it from the billing page.',
        code: BillingErrorCodes.ALREADY_SUBSCRIBED,
      });

    const lineItems = this.lineItems(input.plan, input.interval, input.extra_seats);
    const customer = await this.ensureOrganisationCustomer(ctx.organisationId);
    const metadata = {
      organisation_id: ctx.organisationId,
      plan: input.plan,
      interval: input.interval,
      user_id: ctx.userId,
    };
    const session = await this.stripe.createCheckoutSession(
      {
        mode: 'subscription',
        customer,
        client_reference_id: ctx.organisationId,
        line_items: lineItems,
        metadata,
        subscription_data: { metadata: { organisation_id: ctx.organisationId } },
        allow_promotion_codes: true,
        success_url: this.appUrl('/settings/billing?checkout=success'),
        cancel_url: this.appUrl('/settings/billing?checkout=canceled'),
      },
      idempotencyKey ? `checkout-${ctx.organisationId}-${idempotencyKey}` : undefined,
    );
    return { url: session.url, session_id: session.id };
  }

  async topup(
    ctx: OrgContext,
    input: { pack_id: string; scope: TopupScope },
    idempotencyKey?: string,
  ) {
    if (!canBuyTopup(ctx, input.scope))
      throw new ForbiddenException({
        message: 'Only the owner can buy minutes for the whole team. You can buy minutes for yourself.',
        code: BillingErrorCodes.BILLING_FORBIDDEN,
      });
    const entitlements = await this.entitlements.getEntitlements(ctx.organisationId);
    if (!entitlements.features.topup_purchases || entitlements.read_only)
      throw new ForbiddenException({
        message: 'Buying minutes needs an active paid plan.',
        code: BillingErrorCodes.TOPUPS_NOT_AVAILABLE,
        plan: entitlements.plan,
      });
    const pack = this.appConfig
      .get('plans.topup_packs')
      .find((item) => item.id === input.pack_id);
    if (!pack) throw new NotFoundException('Unknown minute pack');
    if (!pack.stripe_price_id)
      throw new BadRequestException({
        message: 'This pack cannot be bought yet.',
        code: BillingErrorCodes.PRICE_NOT_CONFIGURED,
      });

    const customer =
      input.scope === 'personal'
        ? await this.ensureUserCustomer(ctx.userId)
        : await this.ensureOrganisationCustomer(ctx.organisationId);
    // The webhook trusts only this metadata and the verified session, never client input (§11).
    const metadata: Record<string, string> = {
      organisation_id: ctx.organisationId,
      pack_id: pack.id,
      scope: input.scope,
      buyer_id: ctx.userId,
      // Snapshot, so a pack edited after the purchase still grants what was paid for.
      live_minutes: String(pack.live_minutes),
      practice_minutes: String(pack.practice_minutes),
      ...(input.scope === 'personal' && { user_id: ctx.userId }),
    };
    const returnPath = input.scope === 'personal' ? '/settings/usage' : '/settings/billing';
    const session = await this.stripe.createCheckoutSession(
      {
        mode: 'payment',
        customer,
        client_reference_id: ctx.organisationId,
        line_items: [{ price: pack.stripe_price_id, quantity: 1 }],
        metadata,
        payment_intent_data: { metadata },
        invoice_creation: { enabled: true, invoice_data: { metadata } },
        success_url: this.appUrl(`${returnPath}?topup=success`),
        cancel_url: this.appUrl(`${returnPath}?topup=canceled`),
      },
      idempotencyKey ? `topup-${ctx.userId}-${idempotencyKey}` : undefined,
    );
    return { url: session.url, session_id: session.id };
  }

  async portal(ctx: OrgContext) {
    this.assertCanManage(ctx);
    const subscription = await this.prisma.subscription.findUnique({
      where: { organisation_id: ctx.organisationId },
    });
    if (!subscription?.stripe_customer_id)
      throw new BadRequestException({
        message: 'There are no payment details yet. Subscribe first.',
        code: BillingErrorCodes.NO_STRIPE_CUSTOMER,
      });
    const session = await this.stripe.createPortalSession(
      subscription.stripe_customer_id,
      this.appUrl('/settings/billing'),
    );
    return { url: session.url };
  }
}

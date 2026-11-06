import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeConfig } from '../stripe.config';

export interface StripeLineItem {
  price: string;
  quantity: number;
}

// Thin wrapper over the Stripe SDK for subscription billing (checkout, portal, subscriptions, schedules,
// invoices, refunds, webhooks). Feature modules use this service and never the SDK directly.
@Injectable()
export class StripeBillingService {
  private readonly logger = new Logger(StripeBillingService.name);

  constructor(
    private readonly stripeConfig: StripeConfig,
    private readonly configService: ConfigService,
  ) {}

  isConfigured(): boolean {
    return !!this.stripeConfig.getStripeClient();
  }

  private get stripe(): Stripe {
    const client = this.stripeConfig.getStripeClient();
    if (!client)
      throw new ServiceUnavailableException({
        message: 'Payments are not configured on this server.',
        code: 'STRIPE_NOT_CONFIGURED',
      });
    return client;
  }

  async retrievePrice(priceId: string): Promise<Stripe.Price | null> {
    if (!priceId || !this.isConfigured()) return null;
    try {
      return await this.stripe.prices.retrieve(priceId);
    } catch (error) {
      this.logger.warn(`Stripe price ${priceId} unavailable: ${error?.message}`);
      return null;
    }
  }

  createCustomer(params: Stripe.CustomerCreateParams, idempotencyKey?: string) {
    return this.stripe.customers.create(params, { idempotencyKey });
  }

  retrieveCustomer(customerId: string) {
    return this.stripe.customers.retrieve(customerId, {
      expand: ['invoice_settings.default_payment_method'],
    });
  }

  retrievePaymentMethod(paymentMethodId: string) {
    return this.stripe.paymentMethods.retrieve(paymentMethodId);
  }

  createCheckoutSession(
    params: Stripe.Checkout.SessionCreateParams,
    idempotencyKey?: string,
  ) {
    return this.stripe.checkout.sessions.create(params, { idempotencyKey });
  }

  retrieveCheckoutSession(sessionId: string) {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }

  createPortalSession(customerId: string, returnUrl: string) {
    return this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
      ...(this.configService.get<string>('STRIPE_PORTAL_CONFIGURATION_ID') && {
        configuration: this.configService.get<string>('STRIPE_PORTAL_CONFIGURATION_ID'),
      }),
    });
  }

  retrieveSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['default_payment_method', 'schedule', 'latest_invoice'],
    });
  }

  updateSubscription(
    subscriptionId: string,
    params: Stripe.SubscriptionUpdateParams,
    idempotencyKey?: string,
  ) {
    return this.stripe.subscriptions.update(subscriptionId, params, {
      idempotencyKey,
    });
  }

  cancelSubscription(
    subscriptionId: string,
    params: Stripe.SubscriptionCancelParams = {},
  ) {
    return this.stripe.subscriptions.cancel(subscriptionId, params);
  }

  previewInvoice(params: Stripe.InvoiceCreatePreviewParams) {
    return this.stripe.invoices.createPreview(params);
  }

  retrieveInvoice(invoiceId: string) {
    return this.stripe.invoices.retrieve(invoiceId, { expand: ['payments'] });
  }

  listInvoices(customerId: string, limit = 100) {
    return this.stripe.invoices.list({ customer: customerId, limit });
  }

  // The payment intent behind a paid invoice (clover API: invoices link payments through invoice.payments).
  async invoicePaymentIntentId(invoiceId: string): Promise<string | null> {
    const payments = await this.stripe.invoicePayments.list({
      invoice: invoiceId,
      limit: 10,
    });
    for (const payment of payments.data) {
      const intent = payment.payment?.payment_intent;
      if (intent) return typeof intent === 'string' ? intent : intent.id;
    }
    return null;
  }

  createSchedule(params: Stripe.SubscriptionScheduleCreateParams) {
    return this.stripe.subscriptionSchedules.create(params);
  }

  retrieveSchedule(scheduleId: string) {
    return this.stripe.subscriptionSchedules.retrieve(scheduleId);
  }

  updateSchedule(scheduleId: string, params: Stripe.SubscriptionScheduleUpdateParams) {
    return this.stripe.subscriptionSchedules.update(scheduleId, params);
  }

  releaseSchedule(scheduleId: string) {
    return this.stripe.subscriptionSchedules.release(scheduleId);
  }

  createRefund(params: Stripe.RefundCreateParams, idempotencyKey?: string) {
    return this.stripe.refunds.create(params, { idempotencyKey });
  }

  retrieveCoupon(couponId: string) {
    return this.stripe.coupons.retrieve(couponId);
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret)
      throw new ServiceUnavailableException('STRIPE_WEBHOOK_SECRET is not set');
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  dashboardUrl(path: string): string {
    const testMode = (this.configService.get<string>('STRIPE_SECRET_KEY') ?? '').startsWith('sk_test');
    return `https://dashboard.stripe.com/${testMode ? 'test/' : ''}${path}`;
  }
}

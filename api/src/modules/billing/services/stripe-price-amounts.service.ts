import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PlanKey } from 'generated/prisma';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { StripeBillingService } from '@/integrations/stripe/services/stripe-billing.service';
import { TtlCache } from '@/shared/utils/cache/ttl-cache';
import { PAID_PLANS, PaidPlanKey } from '@/shared/config/plans/plans.config';

export interface PriceAmount {
  amount_cents: number;
  currency: string;
  interval: string | null;
}

export interface PlanPriceAmounts {
  monthly: PriceAmount | null;
  yearly: PriceAmount | null;
  extra_seat_monthly?: PriceAmount | null;
  extra_seat_yearly?: PriceAmount | null;
}

const PRICE_CACHE_TTL_MS = 10 * 60 * 1000;

// Prices live in Stripe (§2.1); AppConfig only stores their ids. Amounts are cached for 10 minutes.
@Injectable()
export class StripePriceAmountsService implements OnModuleInit, OnModuleDestroy {
  private readonly cache = new TtlCache<PriceAmount | null>(PRICE_CACHE_TTL_MS);
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly appConfig: AppConfigService,
    private readonly stripe: StripeBillingService,
  ) {}

  onModuleInit() {
    this.unsubscribe = this.appConfig.onChange((key) => {
      if (key === 'plans.stripe_prices' || key === 'plans.topup_packs') this.cache.clear();
    });
  }

  onModuleDestroy() {
    this.unsubscribe?.();
  }

  amount(priceId: string | undefined | null): Promise<PriceAmount | null> {
    if (!priceId) return Promise.resolve(null);
    return this.cache.getOrLoad(priceId, async () => {
      const price = await this.stripe.retrievePrice(priceId);
      if (!price || price.unit_amount == null) return null;
      return {
        amount_cents: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval ?? null,
      };
    });
  }

  async planAmounts(): Promise<Partial<Record<PlanKey, PlanPriceAmounts>>> {
    const ids = this.appConfig.get('plans.stripe_prices');
    const entries = await Promise.all(
      PAID_PLANS.map(async (plan: PaidPlanKey) => {
        const planIds = ids[plan] as Record<string, string>;
        const [monthly, yearly, seatMonthly, seatYearly] = await Promise.all([
          this.amount(planIds.monthly),
          this.amount(planIds.yearly),
          this.amount(planIds.extra_seat_monthly),
          this.amount(planIds.extra_seat_yearly),
        ]);
        return [
          plan,
          {
            monthly,
            yearly,
            ...(plan === PlanKey.COACH && {
              extra_seat_monthly: seatMonthly,
              extra_seat_yearly: seatYearly,
            }),
          },
        ] as const;
      }),
    );
    return Object.fromEntries(entries);
  }

  async packAmounts(): Promise<Record<string, PriceAmount | null>> {
    const packs = this.appConfig.get('plans.topup_packs');
    const amounts = await Promise.all(
      packs.map(async (pack) => [pack.id, await this.amount(pack.stripe_price_id)] as const),
    );
    return Object.fromEntries(amounts);
  }

  // Which plan and interval a Stripe price id belongs to (webhooks map subscriptions back to plans).
  planForPrice(priceId: string): {
    plan: PaidPlanKey;
    interval: 'month' | 'year';
    seat: boolean;
  } | null {
    const ids = this.appConfig.get('plans.stripe_prices');
    for (const plan of PAID_PLANS) {
      const planIds = ids[plan] as Record<string, string>;
      for (const [key, id] of Object.entries(planIds)) {
        if (!id || id !== priceId) continue;
        return {
          plan,
          interval: key.endsWith('yearly') ? 'year' : 'month',
          seat: key.startsWith('extra_seat'),
        };
      }
    }
    return null;
  }
}

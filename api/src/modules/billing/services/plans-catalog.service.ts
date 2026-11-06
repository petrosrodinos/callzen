import { Injectable } from '@nestjs/common';
import { PlanKey } from 'generated/prisma';
import { AppConfigService } from '@/modules/app-config/app-config.service';
import { PLAN_ORDER } from '@/shared/config/plans/plans.config';
import { StripePriceAmountsService } from './stripe-price-amounts.service';

// Public plan catalog for the pricing and upgrade UI: limits and features from AppConfig, amounts from
// Stripe (§8.6). Stripe price ids and costs are never exposed.
@Injectable()
export class PlansCatalogService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly priceAmounts: StripePriceAmountsService,
  ) {}

  async list() {
    const definitions = this.appConfig.get('plans.definitions');
    const amounts = await this.priceAmounts.planAmounts();
    const packs = this.appConfig.get('plans.topup_packs');
    const packAmounts = await this.priceAmounts.packAmounts();

    return {
      plans: PLAN_ORDER.map((key) => ({
        key,
        is_paid: key !== PlanKey.TRIAL,
        limits: definitions[key].limits,
        features: definitions[key].features,
        prices: amounts[key] ?? null,
      })),
      topup_packs: packs.map((pack) => ({
        id: pack.id,
        label_key: pack.label_key,
        live_minutes: pack.live_minutes,
        practice_minutes: pack.practice_minutes,
        price: packAmounts[pack.id] ?? null,
        available: !!pack.stripe_price_id,
      })),
      // Public, so the app can name the plan that unlocks a locked analysis section (§9.4).
      analysis_visibility: this.appConfig.get('analysis.visibility'),
      currency: 'usd',
    };
  }
}

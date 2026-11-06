import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { StripeWebhooksService } from '../services/stripe-webhooks.service';

// Public endpoint: authenticated by Stripe's signature over the raw body (express.raw is mounted for this
// path in main.ts, before the JSON parser).
@ApiTags('Billing')
@Controller('billing')
export class BillingWebhookController {
  constructor(private readonly webhooks: StripeWebhooksService) {}

  @Post('webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  receive(@Req() req: Request, @Headers('stripe-signature') signature: string) {
    return this.webhooks.receive(
      Buffer.isBuffer(req.body) ? req.body : undefined,
      signature,
    );
  }
}

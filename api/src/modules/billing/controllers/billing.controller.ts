import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrgGuard } from '@/shared/guards/org.guard';
import { Org, RequirePermissions } from '@/shared/decorators/org.decorator';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { BillingCheckoutService } from '../services/billing-checkout.service';
import { BillingAccountService } from '../services/billing-account.service';
import {
  CancelPlanDto,
  ChangePlanDto,
  CheckoutDto,
  PlanSelectionDto,
  TopupDto,
} from '../dto/billing.dto';
import {
  BillingInvoicesQuerySchema,
  type BillingInvoicesQueryType,
} from '../dto/admin-subscriptions-query.schema';

// Billing of the active organisation (§11, §11a): billing.view to read, billing.manage to change. Personal
// top-ups and "my purchases" are open to every member.
@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(JwtGuard, OrgGuard)
export class BillingController {
  constructor(
    private readonly checkout: BillingCheckoutService,
    private readonly account: BillingAccountService,
  ) {}

  @Get('overview')
  @RequirePermissions(Permissions.BILLING_VIEW)
  @ApiOperation({ summary: 'Plan, status, price, next charge, pending change, seats, payment method, banners' })
  overview(@Org() ctx: OrgContext) {
    return this.account.overview(ctx);
  }

  @Get('invoices')
  @RequirePermissions(Permissions.BILLING_VIEW)
  @ApiOperation({ summary: 'Invoices and payments of the organisation, newest first' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  invoices(
    @Org() ctx: OrgContext,
    @Query(new ZodValidationPipe(BillingInvoicesQuerySchema)) query: BillingInvoicesQueryType,
  ) {
    return this.account.invoices(ctx, query.cursor, query.limit);
  }

  @Get('events')
  @RequirePermissions(Permissions.BILLING_VIEW)
  @ApiOperation({ summary: 'Plan history' })
  events(@Org() ctx: OrgContext) {
    return this.account.events(ctx);
  }

  @Get('me/purchases')
  @ApiOperation({ summary: 'My own personal minute purchases and receipts (any member)' })
  myPurchases(@Org() ctx: OrgContext) {
    return this.account.myPurchases(ctx);
  }

  @Post('checkout')
  @HttpCode(200)
  @RequirePermissions(Permissions.BILLING_MANAGE)
  @ApiOperation({ summary: 'Stripe Checkout for a new subscription' })
  createCheckout(
    @Org() ctx: OrgContext,
    @Body() dto: CheckoutDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.checkout.checkout(ctx, dto, idempotencyKey);
  }

  @Post('topup')
  @HttpCode(200)
  @ApiOperation({ summary: 'Buy a minute pack, for yourself (any member) or the team (owner/billing.manage)' })
  topup(
    @Org() ctx: OrgContext,
    @Body() dto: TopupDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.checkout.topup(ctx, dto, dto.idempotency_key ?? idempotencyKey);
  }

  @Post('portal')
  @HttpCode(200)
  @RequirePermissions(Permissions.BILLING_MANAGE)
  @ApiOperation({ summary: 'Stripe Customer Portal for payment method and billing details only' })
  portal(@Org() ctx: OrgContext) {
    return this.checkout.portal(ctx);
  }

  @Post('preview-change')
  @HttpCode(200)
  @RequirePermissions(Permissions.BILLING_MANAGE)
  @ApiOperation({ summary: 'What a plan, interval or seat change costs now and next' })
  previewChange(@Org() ctx: OrgContext, @Body() dto: PlanSelectionDto) {
    return this.account.previewChange(ctx, dto);
  }

  @Post('change-plan')
  @HttpCode(200)
  @RequirePermissions(Permissions.BILLING_MANAGE)
  @ApiOperation({
    summary: 'Upgrade now, schedule a downgrade for the period end, or get a Checkout url when there is no card',
  })
  changePlan(
    @Org() ctx: OrgContext,
    @Body() dto: ChangePlanDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.account.changePlan(ctx, dto, dto.idempotency_key ?? idempotencyKey);
  }

  @Post('cancel')
  @HttpCode(200)
  @RequirePermissions(Permissions.BILLING_MANAGE)
  @ApiOperation({ summary: 'Cancel at the end of the paid period' })
  cancel(@Org() ctx: OrgContext, @Body() dto: CancelPlanDto) {
    return this.account.cancel(ctx, dto);
  }

  @Post('resume')
  @HttpCode(200)
  @RequirePermissions(Permissions.BILLING_MANAGE)
  @ApiOperation({ summary: 'Remove a scheduled cancellation or scheduled change' })
  resume(@Org() ctx: OrgContext) {
    return this.account.resume(ctx);
  }
}

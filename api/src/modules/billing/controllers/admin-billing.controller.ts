import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthRole } from 'generated/prisma';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { AdminSubscriptionsService } from '../services/admin-subscriptions.service';
import {
  AdminCancelDto,
  ApplyDiscountDto,
  AssignManualPlanDto,
  ExtendTrialDto,
  GrantCreditsDto,
  RefundInvoiceDto,
} from '../dto/billing.dto';
import {
  AdminOrganisationsQuerySchema,
  type AdminOrganisationsQueryType,
  AdminPaymentsQuerySchema,
  type AdminPaymentsQueryType,
  AdminSubscriptionDetailQuerySchema,
  type AdminSubscriptionDetailQueryType,
  AdminSubscriptionsQuerySchema,
  type AdminSubscriptionsQueryType,
} from '../dto/admin-subscriptions-query.schema';

interface AdminUser {
  id: string;
  role: string;
}

// Platform admins only (ADMIN / SUPER_ADMIN; SUPPORT has no access, §5.3). Refunds and immediate cancels are
// additionally SUPER_ADMIN-only (checked in the service).
@ApiTags('Admin: Subscriptions')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
export class AdminBillingController {
  constructor(private readonly admin: AdminSubscriptionsService) {}

  // ---------- Organisations (§5.3) ----------

  @Get('organisations')
  @ApiOperation({ summary: 'Organisations with plan and status, for manual plan assignment' })
  organisations(@Query(new ZodValidationPipe(AdminOrganisationsQuerySchema)) query: AdminOrganisationsQueryType) {
    return this.admin.searchOrganisations(query.search);
  }

  @Put('organisations/:id/subscription')
  @ApiOperation({ summary: 'Assign a MANUAL plan with extra seats, period end and a note' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignManualPlanDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.admin.assignManual(id, dto, adminId);
  }

  @Post('organisations/:id/credits')
  @ApiOperation({ summary: 'Grant minutes to the team pool or one member' })
  grantCredits(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GrantCreditsDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.admin.grantCredits(id, dto, adminId);
  }

  @Get('organisations/:id/usage')
  @ApiOperation({ summary: 'Full AI cost breakdown of one organisation' })
  usage(
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(AdminOrganisationsQuerySchema)) query: AdminOrganisationsQueryType,
  ) {
    return this.admin.organisationUsage(id, query.days);
  }

  // ---------- Subscriptions (§11b) ----------

  @Get('subscriptions')
  @ApiOperation({ summary: 'Subscriptions list with filters, pagination and summary tiles' })
  list(@Query(new ZodValidationPipe(AdminSubscriptionsQuerySchema)) query: AdminSubscriptionsQueryType) {
    return this.admin.list(query);
  }

  @Get('subscriptions/export.csv')
  @ApiOperation({ summary: 'CSV of the filtered subscriptions list' })
  async export(
    @Query(new ZodValidationPipe(AdminSubscriptionsQuerySchema)) query: AdminSubscriptionsQueryType,
    @Res() res: Response,
  ) {
    const csv = await this.admin.exportCsv(query);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="subscriptions-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    });
    res.send(csv);
  }

  @Get('subscriptions/:organisationId')
  @ApiOperation({ summary: 'Subscription detail: limits, usage, credits, margin, invoices, members, timeline' })
  detail(
    @Param('organisationId', ParseUUIDPipe) organisationId: string,
    @Query(new ZodValidationPipe(AdminSubscriptionDetailQuerySchema)) query: AdminSubscriptionDetailQueryType,
  ) {
    return this.admin.detail(organisationId, query.event_type);
  }

  @Post('subscriptions/:organisationId/extend-trial')
  @HttpCode(200)
  extendTrial(
    @Param('organisationId', ParseUUIDPipe) organisationId: string,
    @Body() dto: ExtendTrialDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.admin.extendTrial(organisationId, dto.days, adminId, dto.note);
  }

  @Post('subscriptions/:organisationId/discount')
  @HttpCode(200)
  discount(
    @Param('organisationId', ParseUUIDPipe) organisationId: string,
    @Body() dto: ApplyDiscountDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.admin.applyDiscount(organisationId, dto.coupon_id, adminId);
  }

  @Post('subscriptions/:organisationId/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel at period end (admins) or immediately (super admins)' })
  cancel(
    @Param('organisationId', ParseUUIDPipe) organisationId: string,
    @Body() dto: AdminCancelDto,
    @CurrentUser() user: AdminUser,
  ) {
    return this.admin.cancel(organisationId, dto, { id: user.id, role: user.role });
  }

  @Post('subscriptions/:organisationId/resume')
  @HttpCode(200)
  resume(
    @Param('organisationId', ParseUUIDPipe) organisationId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.admin.resume(organisationId, adminId);
  }

  @Post('subscriptions/:organisationId/sync')
  @HttpCode(200)
  @ApiOperation({ summary: 'Re-sync the subscription and invoices from Stripe' })
  sync(
    @Param('organisationId', ParseUUIDPipe) organisationId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.admin.resync(organisationId, adminId);
  }

  // ---------- Payments ----------

  @Get('payments')
  @ApiOperation({ summary: 'Every invoice and payment, with filters and totals (Payments and Failed tabs)' })
  payments(@Query(new ZodValidationPipe(AdminPaymentsQuerySchema)) query: AdminPaymentsQueryType) {
    return this.admin.payments(query);
  }

  @Post('billing-invoices/:id/refund')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refund an invoice in full or in part (super admins)' })
  refund(
    @Param('id') id: string,
    @Body() dto: RefundInvoiceDto,
    @CurrentUser() user: AdminUser,
  ) {
    return this.admin.refundInvoice(id, dto, { id: user.id, role: user.role });
  }
}

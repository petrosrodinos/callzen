import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthRole } from 'generated/prisma';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { PricingAdminService } from './services/pricing-admin.service';

@ApiTags('Admin: Model pricing')
@ApiBearerAuth()
@Controller('admin/model-pricing')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
export class PricingAdminController {
  constructor(private readonly pricingAdmin: PricingAdminService) {}

  @Get()
  @ApiOperation({
    summary:
      'Resolved prices with source and fetched_at, unpriced models and last sync status',
  })
  overview() {
    return this.pricingAdmin.overview();
  }

  @Post('sync')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sync prices from models.dev now' })
  sync() {
    return this.pricingAdmin.syncNow();
  }
}

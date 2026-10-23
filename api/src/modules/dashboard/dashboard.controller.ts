import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrgGuard } from '@/shared/guards/org.guard';
import { Org } from '@/shared/decorators/org.decorator';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { DashboardService } from './dashboard.service';
import {
  DashboardQuerySchema,
  type DashboardQueryType,
} from './dto/dashboard-query.schema';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtGuard, OrgGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Performance over time: trends, recurring mistakes, outcomes, practice progress',
  })
  @ApiQuery({ name: 'days', required: false })
  @ApiQuery({ name: 'scope', required: false, enum: ['me', 'team'] })
  overview(
    @Org() ctx: OrgContext,
    @Query(new ZodValidationPipe(DashboardQuerySchema))
    query: DashboardQueryType,
  ) {
    return this.dashboardService.overview(ctx, query);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { DashboardService } from './dashboard.service';
import {
  DashboardQuerySchema,
  type DashboardQueryType,
} from './dto/dashboard-query.schema';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Performance over time: trends, recurring mistakes, outcomes, practice progress',
  })
  @ApiQuery({ name: 'days', required: false })
  overview(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(DashboardQuerySchema))
    query: DashboardQueryType,
  ) {
    return this.dashboardService.overview(userId, query);
  }
}

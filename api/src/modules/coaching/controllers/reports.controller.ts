import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrgGuard } from '@/shared/guards/org.guard';
import { Org, RequirePermissions } from '@/shared/decorators/org.decorator';
import { RequiresFeature } from '@/shared/decorators/requires-feature.decorator';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { PlanFeatures } from '@/shared/config/plans/plans.config';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { CoachReportsService } from '../services/coach-reports.service';
import { CoachingExportService } from '../services/coaching-export.service';
import {
  CallsExportQuerySchema,
  type CallsExportQueryType,
  ReportsQuerySchema,
  type ReportsQueryType,
} from '../dto/coaching-query.schema';

// Weekly reports stay readable after a downgrade (kept indefinitely); only generation needs the plan flag.
@ApiTags('Coaching: reports')
@ApiBearerAuth()
@Controller('coaching/reports')
@UseGuards(JwtGuard, OrgGuard)
@RequirePermissions(Permissions.COACHING_VIEW)
export class ReportsController {
  constructor(private readonly reports: CoachReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Weekly reports, newest first' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  list(
    @Org() ctx: OrgContext,
    @Query(new ZodValidationPipe(ReportsQuerySchema)) query: ReportsQueryType,
  ) {
    return this.reports.list(ctx, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One weekly report, with names for its ids' })
  findOne(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.reports.findOne(ctx, id);
  }
}

@ApiTags('Coaching: export')
@ApiBearerAuth()
@Controller('coaching/export')
@UseGuards(JwtGuard, OrgGuard)
@RequirePermissions(Permissions.COACHING_EXPORT)
@RequiresFeature(PlanFeatures.STUDENT_EXPORT)
export class CoachingExportController {
  constructor(private readonly exports: CoachingExportService) {}

  @Get('students.csv')
  @ApiProduces('text/csv')
  @ApiOperation({ summary: 'One row per student (CSV)' })
  async students(@Org() ctx: OrgContext) {
    return new StreamableFile(await this.exports.students(ctx), {
      type: 'text/csv; charset=utf-8',
      disposition: 'attachment; filename="students.csv"',
    });
  }

  @Get('calls.csv')
  @ApiProduces('text/csv')
  @ApiOperation({ summary: 'One row per call (CSV), optionally for one student' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'user_id', required: false })
  calls(
    @Org() ctx: OrgContext,
    @Query(new ZodValidationPipe(CallsExportQuerySchema)) query: CallsExportQueryType,
  ) {
    return new StreamableFile(this.exports.calls(ctx, query), {
      type: 'text/csv; charset=utf-8',
      disposition: 'attachment; filename="calls.csv"',
    });
  }
}

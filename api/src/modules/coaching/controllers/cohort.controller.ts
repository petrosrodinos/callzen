import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrgGuard } from '@/shared/guards/org.guard';
import { Org, RequirePermissions } from '@/shared/decorators/org.decorator';
import { RequiresFeature } from '@/shared/decorators/requires-feature.decorator';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { PlanFeatures } from '@/shared/config/plans/plans.config';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { CohortService } from '../services/cohort.service';
import { StudentsService } from '../services/students.service';
import {
  CoachingWindowQuerySchema,
  type CoachingWindowQueryType,
} from '../dto/coaching-query.schema';

@ApiTags('Coaching')
@ApiBearerAuth()
@Controller('coaching')
@UseGuards(JwtGuard, OrgGuard)
@RequirePermissions(Permissions.COACHING_VIEW)
export class CohortController {
  constructor(
    private readonly cohort: CohortService,
    private readonly students: StudentsService,
  ) {}

  @Get('cohort')
  @RequiresFeature(PlanFeatures.COHORT_DASHBOARD)
  @ApiOperation({
    summary:
      'Cohort dashboard: every student with scores, sessions, minutes against caps and inactivity',
  })
  @ApiQuery({ name: 'days', required: false })
  overview(
    @Org() ctx: OrgContext,
    @Query(new ZodValidationPipe(CoachingWindowQuerySchema)) query: CoachingWindowQueryType,
  ) {
    return this.cohort.overview(ctx, query);
  }

  @Get('students/:userId')
  @RequiresFeature(PlanFeatures.STUDENT_PAGES)
  @ApiOperation({ summary: 'One student: KPIs, progress, calls, assignments and comments' })
  @ApiQuery({ name: 'days', required: false })
  student(
    @Org() ctx: OrgContext,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query(new ZodValidationPipe(CoachingWindowQuerySchema)) query: CoachingWindowQueryType,
  ) {
    return this.students.findOne(ctx, userId, query);
  }
}

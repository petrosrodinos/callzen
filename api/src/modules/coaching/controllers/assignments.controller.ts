import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrgGuard } from '@/shared/guards/org.guard';
import { Org, RequirePermissions } from '@/shared/decorators/org.decorator';
import { RequiresFeature } from '@/shared/decorators/requires-feature.decorator';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { PlanFeatures } from '@/shared/config/plans/plans.config';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { AssignmentsService } from '../services/assignments.service';
import { CreateAssignmentDto } from '../dto/create-assignment.dto';
import { UpdateAssignmentDto } from '../dto/update-assignment.dto';
import {
  AssignmentQuerySchema,
  type AssignmentQueryType,
  MyAssignmentsQuerySchema,
  type MyAssignmentsQueryType,
} from '../dto/coaching-query.schema';

@ApiTags('Coaching: assignments')
@ApiBearerAuth()
@Controller('coaching/assignments')
@UseGuards(JwtGuard, OrgGuard)
@RequiresFeature(PlanFeatures.PRACTICE_ASSIGNMENTS)
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Post()
  @RequirePermissions(Permissions.COACHING_MANAGE)
  @ApiOperation({ summary: 'Assign a practice prospect to students or everyone' })
  create(@Org() ctx: OrgContext, @Body() dto: CreateAssignmentDto) {
    return this.assignments.create(ctx, dto);
  }

  @Get()
  @RequirePermissions(Permissions.COACHING_VIEW)
  @ApiOperation({ summary: 'Assignments with progress per student' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'user_id', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['open', 'overdue', 'completed', 'archived', 'all'],
  })
  findAll(
    @Org() ctx: OrgContext,
    @Query(new ZodValidationPipe(AssignmentQuerySchema)) query: AssignmentQueryType,
  ) {
    return this.assignments.findAll(ctx, query);
  }

  @Get(':id')
  @RequirePermissions(Permissions.COACHING_VIEW)
  @ApiOperation({ summary: 'An assignment with each student’s attempts' })
  findOne(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.assignments.findOne(ctx, id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.COACHING_MANAGE)
  @ApiOperation({ summary: 'Edit (not the prospect), add students, archive or restore' })
  update(
    @Org() ctx: OrgContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.assignments.update(ctx, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permissions.COACHING_MANAGE)
  @ApiOperation({ summary: 'Delete an assignment (calls are kept)' })
  remove(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.assignments.remove(ctx, id);
  }
}

// The student side: any member sees their own assignments, whatever the plan (kept after a downgrade).
@ApiTags('Coaching: assignments')
@ApiBearerAuth()
@Controller('assignments')
@UseGuards(JwtGuard, OrgGuard)
export class MyAssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Get('mine')
  @ApiOperation({ summary: 'Assignments given to me' })
  @ApiQuery({ name: 'status', required: false, enum: ['open', 'all'] })
  mine(
    @Org() ctx: OrgContext,
    @Query(new ZodValidationPipe(MyAssignmentsQuerySchema)) query: MyAssignmentsQueryType,
  ) {
    return this.assignments.mine(ctx, query);
  }
}

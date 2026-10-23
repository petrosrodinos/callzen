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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrgGuard } from '@/shared/guards/org.guard';
import { Org, RequirePermissions } from '@/shared/decorators/org.decorator';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { PracticeAgentsService } from './practice-agents.service';
import { CreatePracticeAgentDto } from './dto/create-practice-agent.dto';
import { UpdatePracticeAgentDto } from './dto/update-practice-agent.dto';
import {
  GeneratePracticeAgentDto,
  RandomizePracticeAgentDto,
} from './dto/generate-practice-agent.dto';
import {
  PracticeAgentQuerySchema,
  type PracticeAgentQueryType,
} from './dto/practice-agent-query.schema';

@ApiTags('Practice Agents')
@ApiBearerAuth()
@Controller('practice-agents')
@UseGuards(JwtGuard, OrgGuard)
export class PracticeAgentsController {
  constructor(private readonly practiceAgentsService: PracticeAgentsService) {}

  @RequirePermissions(Permissions.PROSPECTS_MANAGE)
  @Post()
  @ApiOperation({ summary: 'Create a practice agent (AI prospect)' })
  create(@Org() ctx: OrgContext, @Body() dto: CreatePracticeAgentDto) {
    return this.practiceAgentsService.create(ctx, dto);
  }

  @RequirePermissions(Permissions.PROSPECTS_MANAGE)
  @Post('generate')
  @ApiOperation({
    summary: 'Generate a practice agent from a one-sentence description',
  })
  generate(@Org() ctx: OrgContext, @Body() dto: GeneratePracticeAgentDto) {
    return this.practiceAgentsService.generate(ctx, dto);
  }

  @RequirePermissions(Permissions.PROSPECTS_MANAGE)
  @Post('randomize')
  @ApiOperation({ summary: 'Generate a random practice agent within limits' })
  randomize(@Org() ctx: OrgContext, @Body() dto: RandomizePracticeAgentDto) {
    return this.practiceAgentsService.randomize(ctx, dto);
  }

  @RequirePermissions(Permissions.PROSPECTS_MANAGE)
  @Post('from-call/:callId')
  @ApiOperation({
    summary:
      'Create a practice agent that recreates the prospect of a live call',
  })
  fromCall(
    @Org() ctx: OrgContext,
    @Param('callId', ParseUUIDPipe) callId: string,
  ) {
    return this.practiceAgentsService.fromCall(ctx, callId);
  }

  @RequirePermissions(Permissions.CALLS_CREATE)
  @Get()
  @ApiOperation({ summary: 'List practice agents with practice statistics' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'archived', 'all'],
  })
  @ApiQuery({
    name: 'lead_temperature',
    required: false,
    enum: ['COLD', 'WARM'],
  })
  @ApiQuery({ name: 'difficulty', required: false })
  findAll(
    @Org() ctx: OrgContext,
    @Query(new ZodValidationPipe(PracticeAgentQuerySchema))
    query: PracticeAgentQueryType,
  ) {
    return this.practiceAgentsService.findAll(ctx, query);
  }

  @RequirePermissions(Permissions.CALLS_CREATE)
  @Get(':id')
  @ApiOperation({ summary: 'Get a practice agent' })
  findOne(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.practiceAgentsService.findOne(ctx, id);
  }

  @RequirePermissions(Permissions.PROSPECTS_MANAGE)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a practice agent' })
  update(
    @Org() ctx: OrgContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePracticeAgentDto,
  ) {
    return this.practiceAgentsService.update(ctx, id, dto);
  }

  @RequirePermissions(Permissions.PROSPECTS_MANAGE)
  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a practice agent' })
  duplicate(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.practiceAgentsService.duplicate(ctx, id);
  }

  @RequirePermissions(Permissions.PROSPECTS_MANAGE)
  @Post(':id/harder')
  @ApiOperation({ summary: 'Create a harder version of a practice agent' })
  harder(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.practiceAgentsService.harder(ctx, id);
  }

  @RequirePermissions(Permissions.PROSPECTS_MANAGE)
  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a practice agent' })
  archive(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.practiceAgentsService.setArchived(ctx, id, true);
  }

  @RequirePermissions(Permissions.PROSPECTS_MANAGE)
  @Post(':id/unarchive')
  @ApiOperation({ summary: 'Restore an archived practice agent' })
  unarchive(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.practiceAgentsService.setArchived(ctx, id, false);
  }

  @RequirePermissions(Permissions.PROSPECTS_MANAGE)
  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete a practice agent' })
  remove(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.practiceAgentsService.remove(ctx, id);
  }
}

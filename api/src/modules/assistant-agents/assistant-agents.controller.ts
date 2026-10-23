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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrgGuard } from '@/shared/guards/org.guard';
import { Org, RequirePermissions } from '@/shared/decorators/org.decorator';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { AssistantAgentsService } from './assistant-agents.service';
import { CreateAssistantAgentDto } from './dto/create-assistant-agent.dto';
import { UpdateAssistantAgentDto } from './dto/update-assistant-agent.dto';
import {
  AssistantAgentQuerySchema,
  type AssistantAgentQueryType,
} from './dto/assistant-agent-query.schema';

@ApiTags('Assistant Agents')
@ApiBearerAuth()
@Controller('assistant-agents')
@UseGuards(JwtGuard, OrgGuard)
export class AssistantAgentsController {
  constructor(
    private readonly assistantAgentsService: AssistantAgentsService,
  ) {}

  @RequirePermissions(Permissions.AGENTS_MANAGE)
  @Post()
  @ApiOperation({
    summary: 'Create an assistant agent (optionally from a template)',
  })
  @ApiResponse({ status: 201, description: 'Agent created' })
  create(@Org() ctx: OrgContext, @Body() dto: CreateAssistantAgentDto) {
    return this.assistantAgentsService.create(ctx, dto);
  }

  @RequirePermissions(Permissions.AGENTS_VIEW)
  @Get()
  @ApiOperation({ summary: 'List assistant agents with usage statistics' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'archived', 'all'],
  })
  findAll(
    @Org() ctx: OrgContext,
    @Query(new ZodValidationPipe(AssistantAgentQuerySchema))
    query: AssistantAgentQueryType,
  ) {
    return this.assistantAgentsService.findAll(ctx, query);
  }

  @RequirePermissions(Permissions.AGENTS_VIEW)
  @Get(':id')
  @ApiOperation({ summary: 'Get an assistant agent' })
  findOne(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.assistantAgentsService.findOne(ctx, id);
  }

  @RequirePermissions(Permissions.AGENTS_MANAGE)
  @Patch(':id')
  @ApiOperation({ summary: 'Update an assistant agent' })
  update(
    @Org() ctx: OrgContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssistantAgentDto,
  ) {
    return this.assistantAgentsService.update(ctx, id, dto);
  }

  @RequirePermissions(Permissions.AGENTS_MANAGE)
  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an assistant agent' })
  duplicate(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.assistantAgentsService.duplicate(ctx, id);
  }

  @RequirePermissions(Permissions.AGENTS_MANAGE)
  @Post(':id/default')
  @ApiOperation({ summary: 'Mark an assistant agent as the default' })
  setDefault(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.assistantAgentsService.setDefault(ctx, id);
  }

  @RequirePermissions(Permissions.AGENTS_MANAGE)
  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive an assistant agent' })
  archive(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.assistantAgentsService.setArchived(ctx, id, true);
  }

  @RequirePermissions(Permissions.AGENTS_MANAGE)
  @Post(':id/unarchive')
  @ApiOperation({ summary: 'Restore an archived assistant agent' })
  unarchive(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.assistantAgentsService.setArchived(ctx, id, false);
  }

  @RequirePermissions(Permissions.AGENTS_MANAGE)
  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete an assistant agent' })
  remove(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.assistantAgentsService.remove(ctx, id);
  }
}

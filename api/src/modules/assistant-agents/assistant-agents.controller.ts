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
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
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
@UseGuards(JwtGuard)
export class AssistantAgentsController {
  constructor(
    private readonly assistantAgentsService: AssistantAgentsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create an assistant agent (optionally from a template)',
  })
  @ApiResponse({ status: 201, description: 'Agent created' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAssistantAgentDto,
  ) {
    return this.assistantAgentsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List assistant agents with usage statistics' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'archived', 'all'],
  })
  findAll(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(AssistantAgentQuerySchema))
    query: AssistantAgentQueryType,
  ) {
    return this.assistantAgentsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an assistant agent' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assistantAgentsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an assistant agent' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssistantAgentDto,
  ) {
    return this.assistantAgentsService.update(userId, id, dto);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an assistant agent' })
  duplicate(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assistantAgentsService.duplicate(userId, id);
  }

  @Post(':id/default')
  @ApiOperation({ summary: 'Mark an assistant agent as the default' })
  setDefault(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assistantAgentsService.setDefault(userId, id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive an assistant agent' })
  archive(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assistantAgentsService.setArchived(userId, id, true);
  }

  @Post(':id/unarchive')
  @ApiOperation({ summary: 'Restore an archived assistant agent' })
  unarchive(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assistantAgentsService.setArchived(userId, id, false);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete an assistant agent' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assistantAgentsService.remove(userId, id);
  }
}

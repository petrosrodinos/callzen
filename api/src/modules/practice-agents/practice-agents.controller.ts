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
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
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
@UseGuards(JwtGuard)
export class PracticeAgentsController {
  constructor(private readonly practiceAgentsService: PracticeAgentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a practice agent (AI prospect)' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePracticeAgentDto,
  ) {
    return this.practiceAgentsService.create(userId, dto);
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Generate a practice agent from a one-sentence description',
  })
  generate(
    @CurrentUser('id') userId: string,
    @Body() dto: GeneratePracticeAgentDto,
  ) {
    return this.practiceAgentsService.generate(userId, dto);
  }

  @Post('randomize')
  @ApiOperation({ summary: 'Generate a random practice agent within limits' })
  randomize(
    @CurrentUser('id') userId: string,
    @Body() dto: RandomizePracticeAgentDto,
  ) {
    return this.practiceAgentsService.randomize(userId, dto);
  }

  @Post('from-call/:callId')
  @ApiOperation({
    summary:
      'Create a practice agent that recreates the prospect of a live call',
  })
  fromCall(
    @CurrentUser('id') userId: string,
    @Param('callId', ParseUUIDPipe) callId: string,
  ) {
    return this.practiceAgentsService.fromCall(userId, callId);
  }

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
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(PracticeAgentQuerySchema))
    query: PracticeAgentQueryType,
  ) {
    return this.practiceAgentsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a practice agent' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.practiceAgentsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a practice agent' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePracticeAgentDto,
  ) {
    return this.practiceAgentsService.update(userId, id, dto);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a practice agent' })
  duplicate(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.practiceAgentsService.duplicate(userId, id);
  }

  @Post(':id/harder')
  @ApiOperation({ summary: 'Create a harder version of a practice agent' })
  harder(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.practiceAgentsService.harder(userId, id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a practice agent' })
  archive(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.practiceAgentsService.setArchived(userId, id, true);
  }

  @Post(':id/unarchive')
  @ApiOperation({ summary: 'Restore an archived practice agent' })
  unarchive(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.practiceAgentsService.setArchived(userId, id, false);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete a practice agent' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.practiceAgentsService.remove(userId, id);
  }
}

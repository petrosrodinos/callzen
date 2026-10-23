import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipe,
  MaxFileSizeValidator,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { CallsService } from './services/calls.service';
import { CopilotService } from './services/copilot.service';
import { CallAnalysisService } from './services/call-analysis.service';
import { PracticeSessionService } from './services/practice-session.service';
import { CreateCallDto, CreatePracticeCallDto } from './dto/create-call.dto';
import { UpdateCallDto } from './dto/update-call.dto';
import {
  AddSegmentsDto,
  AskCopilotDto,
  CreateBookmarkDto,
  EndCallDto,
  GenerateSuggestionDto,
  PracticeTurnDto,
  RealtimeSessionDto,
  RerunAnalysisDto,
  UpdateSegmentDto,
  UpdateSuggestionDto,
} from './dto/call-session.dto';
import { CallQuerySchema, type CallQueryType } from './dto/call-query.schema';

const MAX_RECORDING_BYTES = 300 * 1024 * 1024;

@ApiTags('Calls')
@ApiBearerAuth()
@Controller('calls')
@UseGuards(JwtGuard)
export class CallsController {
  constructor(
    private readonly callsService: CallsService,
    private readonly copilotService: CopilotService,
    private readonly analysisService: CallAnalysisService,
    private readonly practiceSessionService: PracticeSessionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Start a live call (online meeting or microphone)' })
  startLive(@CurrentUser('id') userId: string, @Body() dto: CreateCallDto) {
    return this.callsService.startLive(userId, dto);
  }

  @Post('practice')
  @ApiOperation({ summary: 'Start a practice session with an AI prospect' })
  startPractice(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePracticeCallDto,
  ) {
    return this.callsService.startPractice(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Call library with search and filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'kind', required: false, enum: ['LIVE', 'PRACTICE'] })
  @ApiQuery({
    name: 'call_type',
    required: false,
    enum: ['ONLINE_MEETING', 'MICROPHONE', 'PRACTICE'],
  })
  @ApiQuery({ name: 'assistant_agent_id', required: false })
  @ApiQuery({ name: 'practice_agent_id', required: false })
  @ApiQuery({ name: 'outcome', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'min_score', required: false })
  @ApiQuery({ name: 'max_score', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({
    name: 'order_by',
    required: false,
    enum: ['started_at', 'duration_seconds', 'score'],
  })
  @ApiQuery({ name: 'order_direction', required: false, enum: ['asc', 'desc'] })
  findAll(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(CallQuerySchema)) query: CallQueryType,
  ) {
    return this.callsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Call detail: transcript, suggestions, bookmarks and analysis',
  })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.callsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update outcome, notes, prospect info, or switch the co-pilot agent',
  })
  update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCallDto,
  ) {
    return this.callsService.update(userId, id, dto);
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End the call and start the analysis' })
  end(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndCallDto,
  ) {
    return this.callsService.end(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Permanently delete a call, its recording, transcript and analysis',
  })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.callsService.remove(userId, id);
  }

  @Post(':id/segments')
  @ApiOperation({
    summary:
      'Append transcript lines; returns a fresh co-pilot suggestion when relevant',
  })
  addSegments(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddSegmentsDto,
  ) {
    return this.copilotService.addSegments(userId, id, dto);
  }

  @Patch(':id/segments/:segmentId')
  @ApiOperation({ summary: 'Correct the speaker of a transcript line' })
  updateSegment(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('segmentId', ParseUUIDPipe) segmentId: string,
    @Body() dto: UpdateSegmentDto,
  ) {
    return this.callsService.updateSegment(userId, id, segmentId, dto);
  }

  @Delete(':id/transcript')
  @ApiOperation({
    summary: 'Delete the transcript of a call (keeps the analysis)',
  })
  deleteTranscript(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.callsService.deleteTranscript(userId, id);
  }

  @Post(':id/suggestions/generate')
  @ApiOperation({ summary: 'Generate a co-pilot suggestion now' })
  generateSuggestion(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateSuggestionDto,
  ) {
    return this.copilotService.generateNow(userId, id, dto);
  }

  @Patch(':id/suggestions/:suggestionId')
  @ApiOperation({ summary: 'Dismiss, pin or rate a suggestion' })
  updateSuggestion(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('suggestionId', ParseUUIDPipe) suggestionId: string,
    @Body() dto: UpdateSuggestionDto,
  ) {
    return this.copilotService.updateSuggestion(userId, id, suggestionId, dto);
  }

  @Post(':id/ask')
  @ApiOperation({
    summary: 'Ask the co-pilot a quick question during the call',
  })
  ask(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AskCopilotDto,
  ) {
    return this.copilotService.ask(userId, id, dto);
  }

  @Post(':id/bookmarks')
  @ApiOperation({ summary: 'Bookmark an important moment' })
  addBookmark(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBookmarkDto,
  ) {
    return this.callsService.addBookmark(userId, id, dto);
  }

  @Delete(':id/bookmarks/:bookmarkId')
  @ApiOperation({ summary: 'Remove a bookmark' })
  removeBookmark(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('bookmarkId', ParseUUIDPipe) bookmarkId: string,
  ) {
    return this.callsService.removeBookmark(userId, id, bookmarkId);
  }

  @Post(':id/recording')
  @ApiOperation({ summary: 'Upload the call recording' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_RECORDING_BYTES } }),
  )
  uploadRecording(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_RECORDING_BYTES }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.callsService.saveRecording(userId, id, file);
  }

  @Get(':id/recording')
  @ApiOperation({ summary: 'Stream the call recording' })
  async getRecording(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const recording = await this.callsService.openRecording(userId, id);
    res.set({
      'Content-Type': recording.mime,
      'Cache-Control': 'private, no-store',
    });
    return new StreamableFile(recording.stream, {
      length: recording.size ?? undefined,
    });
  }

  @Delete(':id/recording')
  @ApiOperation({
    summary: 'Permanently delete the audio, keep transcript and analysis',
  })
  deleteRecording(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.callsService.deleteRecording(userId, id);
  }

  @Post(':id/analysis')
  @ApiOperation({
    summary:
      'Re-run the analysis, optionally with another model or current criteria',
  })
  rerunAnalysis(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RerunAnalysisDto,
  ) {
    return this.analysisService.rerun(userId, id, dto);
  }

  @Post(':id/realtime-session')
  @ApiOperation({
    summary: 'Create a short-lived realtime voice/transcription session token',
  })
  realtimeSession(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RealtimeSessionDto,
  ) {
    return this.practiceSessionService.createRealtimeSession(userId, id, dto);
  }

  @Post(':id/practice-turn')
  @ApiOperation({
    summary:
      'Browser voice provider: send what the salesperson said, get the prospect reply',
  })
  practiceTurn(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PracticeTurnDto,
  ) {
    return this.practiceSessionService.practiceTurn(userId, id, dto);
  }
}

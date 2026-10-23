import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CallEndReason,
  CallOutcome,
  Speaker,
  SuggestionFeedback,
  SuggestionFrequency,
  SuggestionStatus,
} from 'generated/prisma';

export class SegmentInputDto {
  @ApiProperty({
    description: 'Client generated id, used to make retries idempotent',
  })
  @IsString()
  @MaxLength(80)
  client_id: string;

  @ApiProperty({ enum: Speaker })
  @IsEnum(Speaker)
  speaker: Speaker;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  start_ms: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  end_ms: number;
}

export class AddSegmentsDto {
  @ApiProperty({ type: [SegmentInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SegmentInputDto)
  segments: SegmentInputDto[];

  @ApiProperty({
    required: false,
    description: 'false while suggestions are muted',
  })
  @IsOptional()
  @IsBoolean()
  request_suggestion?: boolean;

  @ApiProperty({
    required: false,
    enum: SuggestionFrequency,
    description: 'Overrides the agent frequency for this call',
  })
  @IsOptional()
  @IsEnum(SuggestionFrequency)
  frequency?: SuggestionFrequency;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  elapsed_ms?: number;
}

export class GenerateSuggestionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  elapsed_ms?: number;

  @ApiProperty({ required: false, enum: SuggestionFrequency })
  @IsOptional()
  @IsEnum(SuggestionFrequency)
  frequency?: SuggestionFrequency;
}

export class UpdateSegmentDto {
  @ApiProperty({ enum: [Speaker.USER, Speaker.PROSPECT] })
  @IsIn([Speaker.USER, Speaker.PROSPECT])
  speaker: Speaker;
}

export class UpdateSuggestionDto {
  @ApiProperty({ required: false, enum: SuggestionStatus })
  @IsOptional()
  @IsEnum(SuggestionStatus)
  status?: SuggestionStatus;

  @ApiProperty({ required: false, enum: SuggestionFeedback, nullable: true })
  @IsOptional()
  @IsEnum(SuggestionFeedback)
  feedback?: SuggestionFeedback | null;
}

export class AskCopilotDto {
  @ApiProperty({ example: "What's our pricing for 50 seats?" })
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  question: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  elapsed_ms?: number;
}

export class CreateBookmarkDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  at_ms: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;
}

export class EndCallDto {
  @ApiProperty({ enum: CallEndReason })
  @IsEnum(CallEndReason)
  ended_reason: CallEndReason;

  @ApiProperty()
  @IsInt()
  @Min(0)
  duration_seconds: number;

  @ApiProperty({ required: false, enum: CallOutcome })
  @IsOptional()
  @IsEnum(CallOutcome)
  outcome?: CallOutcome;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  custom_outcome?: string;

  @ApiProperty({
    required: false,
    description: 'Voice/transcription seconds consumed, for usage tracking',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  audio_seconds?: number;
}

export class RerunAnalysisDto {
  @ApiProperty({ required: false, example: 'gpt-4.1' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  model?: string;

  @ApiProperty({
    required: false,
    description:
      'Use the current agent analysis criteria instead of the snapshot',
  })
  @IsOptional()
  @IsBoolean()
  use_current_criteria?: boolean;
}

export class PracticeTurnDto {
  @ApiProperty({
    required: false,
    description:
      'What the salesperson said. Empty for the prospect opening line.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  user_text?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  client_id?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  start_ms: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  end_ms: number;
}

export class RealtimeSessionDto {
  @ApiProperty({ enum: ['TRANSCRIPTION', 'PRACTICE_VOICE'] })
  @IsIn(['TRANSCRIPTION', 'PRACTICE_VOICE'])
  purpose: 'TRANSCRIPTION' | 'PRACTICE_VOICE';
}

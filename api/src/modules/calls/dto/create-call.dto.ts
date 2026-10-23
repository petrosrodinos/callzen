import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { CallType, VoiceProvider } from 'generated/prisma';

export class CreateCallDto {
  @ApiProperty({ enum: [CallType.ONLINE_MEETING, CallType.MICROPHONE] })
  @IsIn([CallType.ONLINE_MEETING, CallType.MICROPHONE])
  call_type: CallType;

  @ApiProperty({
    required: false,
    description: 'Defaults to the user default assistant agent',
  })
  @IsOptional()
  @IsUUID()
  assistant_agent_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  prospect_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  prospect_company?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  prospect_role?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  context_notes?: string;

  @ApiProperty({ required: false, example: 'Book a demo' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  goal?: string;

  @ApiProperty({
    required: false,
    description: 'A prior call with the same prospect',
  })
  @IsOptional()
  @IsUUID()
  prior_call_id?: string;

  @ApiProperty({
    required: false,
    description: 'false = real-time suggestions only, no audio stored',
  })
  @IsOptional()
  @IsBoolean()
  keep_recording?: boolean;

  @ApiProperty({ required: false, example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;
}

export class CreatePracticeCallDto {
  @ApiProperty()
  @IsUUID()
  practice_agent_id: string;

  @ApiProperty({ required: false, description: 'Practice with Co-pilot' })
  @IsOptional()
  @IsBoolean()
  copilot_enabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  assistant_agent_id?: string;

  @ApiProperty({ required: false, enum: VoiceProvider })
  @IsOptional()
  @IsEnum(VoiceProvider)
  voice_provider?: VoiceProvider;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  voice?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  keep_recording?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LeadTemperature, VoiceProvider } from 'generated/prisma';
import {
  BUDGET_TYPES,
  DECISION_AUTHORITY_TYPES,
  MOOD_TYPES,
  PERSONALITY_TYPES,
  SCENARIO_TYPES,
  TIMELINE_TYPES,
} from '@/shared/config/practice/practice-options.config';

export class PracticeObjectionDto {
  @ApiProperty({ example: 'Too expensive' })
  @IsString()
  @MaxLength(500)
  text: string;

  @ApiProperty({
    minimum: 1,
    maximum: 3,
    description: '1 = drops it easily, 3 = keeps coming back',
  })
  @IsInt()
  @Min(1)
  @Max(3)
  persistence: number;
}

export class CreatePracticeAgentDto {
  @ApiProperty({ example: 'Cold Call – Busy Clinic Owner' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({ required: false, example: 'Dr. Papadopoulos' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  prospect_name?: string;

  @ApiProperty({
    example: 'A small restaurant owner being cold-called about a POS system.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  role_prompt: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  scenario_context?: string;

  @ApiProperty({ required: false, enum: SCENARIO_TYPES })
  @IsOptional()
  @IsIn(SCENARIO_TYPES)
  scenario_type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  selling_product?: string;

  @ApiProperty({
    required: false,
    description:
      'Assistant agent whose knowledge describes the product being sold',
  })
  @IsOptional()
  @IsUUID()
  linked_assistant_agent_id?: string | null;

  @ApiProperty({ required: false, example: 'Book a meeting' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  user_objective?: string;

  @ApiProperty({ required: false, enum: LeadTemperature })
  @IsOptional()
  @IsEnum(LeadTemperature)
  lead_temperature?: LeadTemperature;

  @ApiProperty({ required: false, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiProperty({ required: false, enum: PERSONALITY_TYPES })
  @IsOptional()
  @IsIn(PERSONALITY_TYPES)
  personality?: string;

  @ApiProperty({ required: false, enum: MOOD_TYPES })
  @IsOptional()
  @IsIn(MOOD_TYPES)
  mood?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  communication_style?: string;

  @ApiProperty({ required: false, enum: DECISION_AUTHORITY_TYPES })
  @IsOptional()
  @IsIn(DECISION_AUTHORITY_TYPES)
  decision_authority?: string;

  @ApiProperty({ required: false, enum: BUDGET_TYPES })
  @IsOptional()
  @IsIn(BUDGET_TYPES)
  budget?: string;

  @ApiProperty({ required: false, enum: TIMELINE_TYPES })
  @IsOptional()
  @IsIn(TIMELINE_TYPES)
  timeline?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  current_solution?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  pain_points?: string[];

  @ApiProperty({ required: false, type: [PracticeObjectionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PracticeObjectionDto)
  objections?: PracticeObjectionDto[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  hidden_information?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  conversion_conditions?: string[];

  @ApiProperty({ required: false, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  patience?: number;

  @ApiProperty({ required: false, example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  accent?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  industry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  company?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  job_title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  age_range?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  background_story?: string;

  @ApiProperty({
    required: false,
    description: 'What the salesperson realistically knows before the call',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  briefing?: string;

  @ApiProperty({ required: false, enum: VoiceProvider })
  @IsOptional()
  @IsEnum(VoiceProvider)
  voice_provider?: VoiceProvider;

  @ApiProperty({ required: false, example: 'marin' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  voice?: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  time_limit_minutes?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  template_key?: string;
}

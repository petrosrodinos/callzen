import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SuggestionFrequency, SuggestionLength } from 'generated/prisma';

export class ScriptStageDto {
  @ApiProperty({ example: 's1' })
  @IsString()
  @MaxLength(64)
  id: string;

  @ApiProperty({ example: 'OPENER' })
  @IsString()
  @MaxLength(40)
  stage: string;

  @ApiProperty({ example: 'Permission opener' })
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'Hi, it is Maria from Acme...' })
  @IsString()
  @MaxLength(4000)
  content: string;
}

export class ObjectionEntryDto {
  @ApiProperty({ example: 'o1' })
  @IsString()
  @MaxLength(64)
  id: string;

  @ApiProperty({ example: 'Too expensive' })
  @IsString()
  @MaxLength(500)
  objection: string;

  @ApiProperty({ example: 'Compared to what?' })
  @IsString()
  @MaxLength(2000)
  response: string;
}

export class AnalysisCriterionDto {
  @ApiProperty({ example: 'discovery' })
  @IsString()
  @MaxLength(64)
  key: string;

  @ApiProperty({ example: 'Discovery and questioning' })
  @IsString()
  @MaxLength(120)
  label: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0)
  @Max(5)
  weight: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateAssistantAgentDto {
  @ApiProperty({ example: 'Cold Call – Dental Clinics' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ required: false, example: 'Book a demo' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  call_goal?: string;

  @ApiProperty({ type: [ScriptStageDto], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ScriptStageDto)
  script?: ScriptStageDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string;

  @ApiProperty({
    required: false,
    description: 'Product info, pricing, FAQs, competitors, ICP',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60000)
  knowledge?: string;

  @ApiProperty({ type: [ObjectionEntryDto], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => ObjectionEntryDto)
  objection_library?: ObjectionEntryDto[];

  @ApiProperty({ required: false, example: 'BANT' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  methodology?: string;

  @ApiProperty({ required: false, example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiProperty({ required: false, example: 'FRIENDLY' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  tone?: string;

  @ApiProperty({ required: false, enum: SuggestionFrequency })
  @IsOptional()
  @IsEnum(SuggestionFrequency)
  suggestion_frequency?: SuggestionFrequency;

  @ApiProperty({ required: false, enum: SuggestionLength })
  @IsOptional()
  @IsEnum(SuggestionLength)
  suggestion_length?: SuggestionLength;

  @ApiProperty({ required: false, minimum: 0, maximum: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  alternatives_count?: number;

  @ApiProperty({ required: false, example: 'gpt-4.1-mini' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  realtime_model?: string;

  @ApiProperty({ required: false, example: 'gpt-4.1' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  analysis_model?: string;

  @ApiProperty({ type: [AnalysisCriterionDto], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => AnalysisCriterionDto)
  analysis_criteria?: AnalysisCriterionDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  consent_line?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  suggest_consent_line?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiProperty({
    required: false,
    description: 'Template key used to prefill the agent',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  template_key?: string;
}

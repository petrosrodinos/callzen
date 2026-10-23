import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
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
} from 'class-validator';
import { LeadTemperature } from 'generated/prisma';
import { SCENARIO_TYPES } from '@/shared/config/practice/practice-options.config';

export class GeneratePracticeAgentDto {
  @ApiProperty({
    example:
      'A skeptical IT manager at a 200-person bank who just renewed with a competitor',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  description: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  assistant_agent_id?: string;

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

  @ApiProperty({
    required: false,
    description: 'Save the generated agent immediately',
  })
  @IsOptional()
  @IsBoolean()
  save?: boolean;
}

export class RandomizePracticeAgentDto {
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

  @ApiProperty({ required: false, enum: SCENARIO_TYPES })
  @IsOptional()
  @IsIn(SCENARIO_TYPES)
  scenario_type?: string;

  @ApiProperty({ required: false, example: 'B2B SaaS' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  industry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  assistant_agent_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  save?: boolean;
}

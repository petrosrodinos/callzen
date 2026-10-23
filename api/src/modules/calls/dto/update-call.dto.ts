import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { CallOutcome } from 'generated/prisma';

export class UpdateCallDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ required: false, enum: CallOutcome, nullable: true })
  @IsOptional()
  @IsEnum(CallOutcome)
  outcome?: CallOutcome | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  custom_outcome?: string;

  @ApiProperty({ required: false, description: 'Personal notes' })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  user_notes?: string;

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

  @ApiProperty({
    required: false,
    description: 'Switch the co-pilot agent mid-call',
  })
  @IsOptional()
  @IsUUID()
  assistant_agent_id?: string;
}

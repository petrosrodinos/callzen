import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({ description: 'The prospect to practise with' })
  @IsUUID()
  practice_agent_id: string;

  @ApiProperty({ example: 'Handle the price objection' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  instructions?: string;

  @ApiProperty({ required: false, example: '2026-11-20T17:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  due_at?: string;

  @ApiProperty({ required: false, description: 'Passing score (0–100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  target_score?: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  required_attempts?: number;

  @ApiProperty({
    required: false,
    description: 'Everyone, including members who join later',
  })
  @IsOptional()
  @IsBoolean()
  all_members?: boolean;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Students to assign (ignored when all_members is true)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @IsUUID('all', { each: true })
  user_ids?: string[];
}

import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { AgentVisibility } from 'generated/prisma';

export class UpdateAgentAccessDto {
  @ApiProperty({ enum: AgentVisibility, example: AgentVisibility.SELECTED })
  @IsEnum(AgentVisibility)
  visibility: AgentVisibility;

  @ApiProperty({
    type: [String],
    description:
      'Members who may use the item when visibility is SELECTED. Replaces the current list.',
  })
  @IsArray()
  @ArrayMaxSize(1000)
  @IsUUID('all', { each: true })
  user_ids: string[];
}

export class UpdateStudentAccessDto {
  @ApiProperty({
    type: [String],
    description: 'SELECTED co-pilots this student should be on (others are removed)',
  })
  @IsArray()
  @ArrayMaxSize(1000)
  @IsUUID('all', { each: true })
  assistant_agent_ids: string[];

  @ApiProperty({
    type: [String],
    description: 'SELECTED prospects this student should be on (others are removed)',
  })
  @IsArray()
  @ArrayMaxSize(1000)
  @IsUUID('all', { each: true })
  practice_agent_ids: string[];
}

export class ShareAgentsDto {
  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  assistant_agent_ids?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  practice_agent_ids?: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(1000)
  @IsUUID('all', { each: true })
  user_ids: string[];
}

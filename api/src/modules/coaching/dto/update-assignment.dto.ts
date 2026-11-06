import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateAssignmentDto } from './create-assignment.dto';

// The prospect of an assignment cannot be changed once created (§10.1c).
export class UpdateAssignmentDto extends PartialType(
  OmitType(CreateAssignmentDto, ['practice_agent_id'] as const),
) {
  @ApiProperty({ required: false, description: 'Archive or restore' })
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}

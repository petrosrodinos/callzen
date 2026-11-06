import { ApiProperty, PickType } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MAX_COMMENT_LENGTH } from '../utils/comment-rules.utils';

export class CreateCommentDto {
  @ApiProperty({ maxLength: MAX_COMMENT_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_COMMENT_LENGTH)
  body: string;

  @ApiProperty({ required: false, description: 'Reply to this top-level comment' })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiProperty({ required: false, description: 'Position in the recording (ms)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  at_ms?: number;
}

export class UpdateCommentDto extends PickType(CreateCommentDto, ['body'] as const) {}

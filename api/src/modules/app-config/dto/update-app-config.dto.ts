import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateAppConfigDto {
  @ApiProperty({
    description: 'New JSON value, validated against the key schema',
  })
  @IsDefined()
  value: unknown;

  @ApiProperty({
    description:
      'Version the edit is based on; a mismatch returns 409 so concurrent edits are never lost',
    example: 3,
  })
  @IsInt()
  @Min(0)
  version: number;
}

export class ResetAppConfigDto {
  @ApiProperty({ required: false, example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  version?: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

// Multipart fields arrive as strings, so booleans and empty values are normalised first.
const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value;

export class UploadCallDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: unknown;

  @ApiProperty({
    required: false,
    description: 'Defaults to the user default assistant agent',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  assistant_agent_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(120)
  prospect_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(120)
  prospect_company?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(120)
  prospect_role?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(4000)
  context_notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(300)
  goal?: string;

  @ApiProperty({
    required: false,
    description: 'A prior call with the same prospect',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  prior_call_id?: string;

  @ApiProperty({
    required: false,
    example: 'auto',
    description: "One of the co-pilot's languages, or 'auto' to detect it",
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(10)
  language?: string;

  @ApiProperty({
    required: false,
    description: 'false = delete the audio once it has been transcribed',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : undefined,
  )
  @IsBoolean()
  keep_recording?: boolean;
}

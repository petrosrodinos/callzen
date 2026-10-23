import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { OutputLanguageMode } from 'generated/prisma';
import { SUPPORTED_LANGUAGE_CODES } from '@/shared/config/languages/languages.config';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  full_name?: string;

  @ApiProperty({ required: false, example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  interface_language?: string;

  @ApiProperty({
    required: false,
    example: 'el',
    description: 'Language of default templates and examples',
  })
  @IsOptional()
  @IsIn(SUPPORTED_LANGUAGE_CODES)
  preferred_language?: string;

  @ApiProperty({
    required: false,
    enum: OutputLanguageMode,
    description: 'Language of suggestions and analysis',
  })
  @IsOptional()
  @IsEnum(OutputLanguageMode)
  output_language_mode?: OutputLanguageMode;

  @ApiProperty({
    required: false,
    description: 'Default consent disclosure line',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  consent_line?: string;

  @ApiProperty({
    required: false,
    description: 'Keep audio recordings by default',
  })
  @IsOptional()
  @IsBoolean()
  keep_recordings?: boolean;

  @ApiProperty({
    required: false,
    description: 'Acknowledge responsibility for recording consent',
  })
  @IsOptional()
  @IsBoolean()
  consent_acknowledged?: boolean;
}

export class DeleteAccountDto {
  @ApiProperty({
    description: 'Current password to confirm permanent deletion',
  })
  @IsString()
  @MaxLength(200)
  password: string;
}

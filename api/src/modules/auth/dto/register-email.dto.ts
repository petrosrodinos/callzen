// src/modules/auth/dto/register-email.dto.ts

import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SUPPORTED_LANGUAGE_CODES } from '@/shared/config/languages/languages.config';

export class RegisterEmailDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Full name',
    example: 'Maria Papadopoulou',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  full_name?: string;

  @ApiProperty({
    description: 'Preferred language, used for default templates and examples',
    example: 'el',
    enum: SUPPORTED_LANGUAGE_CODES,
    required: false,
  })
  @IsOptional()
  @IsIn(SUPPORTED_LANGUAGE_CODES)
  preferred_language?: string;
}

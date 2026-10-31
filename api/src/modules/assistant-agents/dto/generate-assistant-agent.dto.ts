import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateAssistantAgentDto {
  @ApiProperty({
    example:
      'Cold calls to dental clinics to book a demo of our appointment-reminder software. Friendly tone, owners are busy and skeptical of new tools.',
    description:
      'Plain-language description of the co-pilot: what you sell, who you call and the goal of the call',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  description: string;
}

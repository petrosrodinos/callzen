import { PartialType } from '@nestjs/swagger';
import { CreatePracticeAgentDto } from './create-practice-agent.dto';

export class UpdatePracticeAgentDto extends PartialType(
  CreatePracticeAgentDto,
) {}

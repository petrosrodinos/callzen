import { PartialType } from '@nestjs/swagger';
import { CreateAssistantAgentDto } from './create-assistant-agent.dto';

export class UpdateAssistantAgentDto extends PartialType(
  CreateAssistantAgentDto,
) {}

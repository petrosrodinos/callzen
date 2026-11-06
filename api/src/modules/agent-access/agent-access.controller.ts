import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrgGuard } from '@/shared/guards/org.guard';
import { Org, RequirePermissions } from '@/shared/decorators/org.decorator';
import { RequiresFeature } from '@/shared/decorators/requires-feature.decorator';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { PlanFeatures } from '@/shared/config/plans/plans.config';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { AgentAccessService } from './agent-access.service';
import {
  ShareAgentsDto,
  UpdateAgentAccessDto,
  UpdateStudentAccessDto,
} from './dto/agent-access.dto';

// Per-student access to co-pilots and prospects (§10.1h).
@ApiTags('Agent access')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtGuard, OrgGuard)
export class AgentAccessController {
  constructor(private readonly access: AgentAccessService) {}

  @Put('assistant-agents/:id/access')
  @RequirePermissions(Permissions.AGENTS_MANAGE)
  @RequiresFeature(PlanFeatures.AGENT_ACCESS_CONTROL)
  @ApiOperation({ summary: 'Set who can use a co-pilot (replaces the list)' })
  setCopilotAccess(
    @Org() ctx: OrgContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentAccessDto,
  ) {
    return this.access.setAssistantAgentAccess(ctx, id, dto);
  }

  @Put('practice-agents/:id/access')
  @RequirePermissions(Permissions.PROSPECTS_MANAGE_ALL)
  @RequiresFeature(PlanFeatures.AGENT_ACCESS_CONTROL)
  @ApiOperation({ summary: 'Set who can use a practice prospect (replaces the list)' })
  setProspectAccess(
    @Org() ctx: OrgContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentAccessDto,
  ) {
    return this.access.setPracticeAgentAccess(ctx, id, dto);
  }

  @Get('coaching/students/:userId/access')
  @RequirePermissions(Permissions.COACHING_VIEW)
  @ApiOperation({
    summary: 'Every co-pilot and prospect, with whether this student can use it',
  })
  studentAccess(
    @Org() ctx: OrgContext,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.access.studentAccess(ctx, userId);
  }

  @Put('coaching/students/:userId/access')
  @RequirePermissions(Permissions.COACHING_MANAGE)
  @RequiresFeature(PlanFeatures.AGENT_ACCESS_CONTROL)
  @ApiOperation({ summary: 'Set which selected co-pilots and prospects this student is on' })
  setStudentAccess(
    @Org() ctx: OrgContext,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateStudentAccessDto,
  ) {
    return this.access.setStudentAccess(ctx, userId, dto);
  }

  @Post('agent-access/share')
  @HttpCode(200)
  @RequiresFeature(PlanFeatures.AGENT_ACCESS_CONTROL)
  @ApiOperation({ summary: 'Share several co-pilots and prospects with members at once' })
  share(@Org() ctx: OrgContext, @Body() dto: ShareAgentsDto) {
    return this.access.share(ctx, dto);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrgRole } from 'generated/prisma';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrgGuard } from '@/shared/guards/org.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { Org, RequirePermissions } from '@/shared/decorators/org.decorator';
import { Permissions } from '@/shared/config/permissions/permissions.config';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { OrganisationsService } from './services/organisations.service';
import { MembersService } from './services/members.service';
import { RolesService } from './services/roles.service';
import { InvitationsService } from './services/invitations.service';
import {
  CreateOrganisationDto,
  DeleteOrganisationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  UpdateOrganisationDto,
  UpdateRolePermissionsDto,
} from './dto/organisation.dto';

@ApiTags('Organisations')
@ApiBearerAuth()
@Controller('organisations')
@UseGuards(JwtGuard)
export class OrganisationsController {
  constructor(
    private readonly organisations: OrganisationsService,
    private readonly members: MembersService,
    private readonly roles: RolesService,
    private readonly invitations: InvitationsService,
  ) {}

  // ----- User scoped -----

  @Get()
  @ApiOperation({
    summary:
      'Organisations the current user belongs to, with role and permissions in each',
  })
  listMine(@CurrentUser('id') userId: string) {
    return this.organisations.listMine(userId);
  }

  @Get('permissions')
  @ApiOperation({
    summary: 'Catalogue of every permission that roles can hold',
  })
  permissions() {
    return this.organisations.permissionCatalog();
  }

  @Post()
  @ApiOperation({
    summary: 'Create an organisation; the creator becomes its owner',
  })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrganisationDto,
  ) {
    return this.organisations.create(userId, dto);
  }

  // ----- Organisation scoped (organisation taken from :orgId) -----

  @Patch(':orgId')
  @UseGuards(OrgGuard)
  @RequirePermissions(Permissions.ORG_UPDATE)
  @ApiOperation({ summary: 'Rename the organisation' })
  update(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Org() ctx: OrgContext,
    @Body() dto: UpdateOrganisationDto,
  ) {
    return this.organisations.update(ctx, dto);
  }

  @Delete(':orgId')
  @UseGuards(OrgGuard)
  @RequirePermissions(Permissions.ORG_DELETE)
  @ApiOperation({
    summary: 'Permanently delete the organisation and all its data',
  })
  remove(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Org() ctx: OrgContext,
    @Body() dto: DeleteOrganisationDto,
  ) {
    return this.organisations.remove(ctx, dto);
  }

  @Get(':orgId/members')
  @UseGuards(OrgGuard)
  @RequirePermissions(Permissions.MEMBERS_VIEW)
  @ApiOperation({ summary: 'List members' })
  listMembers(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Org() ctx: OrgContext,
  ) {
    return this.members.list(ctx);
  }

  @Patch(':orgId/members/:memberId')
  @UseGuards(OrgGuard)
  @RequirePermissions(Permissions.MEMBERS_MANAGE)
  @ApiOperation({ summary: 'Change a member role' })
  updateMember(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Org() ctx: OrgContext,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.members.updateRole(ctx, memberId, dto);
  }

  @Delete(':orgId/members/:memberId')
  @UseGuards(OrgGuard)
  @RequirePermissions(Permissions.MEMBERS_MANAGE)
  @ApiOperation({ summary: 'Remove a member' })
  removeMember(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Org() ctx: OrgContext,
  ) {
    return this.members.remove(ctx, memberId);
  }

  @Get(':orgId/roles')
  @UseGuards(OrgGuard)
  @RequirePermissions(Permissions.MEMBERS_VIEW)
  @ApiOperation({ summary: 'Roles with their effective permissions' })
  listRoles(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Org() ctx: OrgContext,
  ) {
    return this.roles.list(ctx);
  }

  @Put(':orgId/roles/:role')
  @UseGuards(OrgGuard)
  @RequirePermissions(Permissions.ROLES_MANAGE)
  @ApiOperation({ summary: 'Set the permissions of a role (owners only)' })
  updateRole(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Param('role', new ParseEnumPipe(OrgRole)) role: OrgRole,
    @Org() ctx: OrgContext,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.roles.update(ctx, role, dto.permissions);
  }

  @Post(':orgId/roles/:role/reset')
  @UseGuards(OrgGuard)
  @RequirePermissions(Permissions.ROLES_MANAGE)
  @ApiOperation({ summary: 'Reset a role to its preset permissions' })
  resetRole(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Param('role', new ParseEnumPipe(OrgRole)) role: OrgRole,
    @Org() ctx: OrgContext,
  ) {
    return this.roles.reset(ctx, role);
  }

  @Get(':orgId/invitations')
  @UseGuards(OrgGuard)
  @RequirePermissions(Permissions.MEMBERS_INVITE)
  @ApiOperation({ summary: 'List invitations' })
  listInvitations(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Org() ctx: OrgContext,
  ) {
    return this.invitations.list(ctx);
  }

  @Post(':orgId/invitations')
  @UseGuards(OrgGuard)
  @RequirePermissions(Permissions.MEMBERS_INVITE)
  @ApiOperation({ summary: 'Invite someone by email' })
  invite(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Org() ctx: OrgContext,
    @Body() dto: InviteMemberDto,
  ) {
    return this.invitations.create(ctx, dto);
  }

  @Post(':orgId/invitations/:invitationId/resend')
  @UseGuards(OrgGuard)
  @RequirePermissions(Permissions.MEMBERS_INVITE)
  @ApiOperation({ summary: 'Resend an invitation with a fresh link' })
  resend(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Org() ctx: OrgContext,
  ) {
    return this.invitations.resend(ctx, invitationId);
  }

  @Post(':orgId/invitations/:invitationId/revoke')
  @UseGuards(OrgGuard)
  @RequirePermissions(Permissions.MEMBERS_INVITE)
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  revoke(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Org() ctx: OrgContext,
  ) {
    return this.invitations.revoke(ctx, invitationId);
  }
}

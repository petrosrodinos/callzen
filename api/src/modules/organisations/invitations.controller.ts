import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { InvitationsService } from './services/invitations.service';
import { AcceptInvitationDto } from './dto/organisation.dto';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get('preview/:token')
  @ApiOperation({
    summary:
      'Public: what an invitation link is for (organisation, role, status)',
  })
  preview(@Param('token') token: string) {
    return this.invitations.preview(token.slice(0, 200));
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Pending invitations sent to the current user email',
  })
  mine(@CurrentUser('id') userId: string) {
    return this.invitations.mine(userId);
  }

  @Post('accept')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Accept an invitation using the token from the link',
  })
  accept(@CurrentUser('id') userId: string, @Body() dto: AcceptInvitationDto) {
    return this.invitations.acceptByToken(userId, dto.token);
  }

  @Post(':invitationId/accept')
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Accept a pending invitation addressed to the current user',
  })
  acceptById(
    @CurrentUser('id') userId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ) {
    return this.invitations.acceptById(userId, invitationId);
  }
}

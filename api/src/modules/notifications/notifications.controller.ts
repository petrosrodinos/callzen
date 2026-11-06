import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrgGuard } from '@/shared/guards/org.guard';
import { Org } from '@/shared/decorators/org.decorator';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { NotificationsService } from './notifications.service';
import {
  NotificationsQuerySchema,
  type NotificationsQueryType,
} from './dto/notifications-query.schema';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtGuard, OrgGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'My notifications in the active organisation' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'unread', required: false, enum: ['true', 'false'] })
  list(
    @Org() ctx: OrgContext,
    @Query(new ZodValidationPipe(NotificationsQuerySchema))
    query: NotificationsQueryType,
  ) {
    return this.notifications.list(ctx.userId, ctx.organisationId, query);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Unread count, plus unread counts in my other organisations',
  })
  unreadCount(@Org() ctx: OrgContext) {
    return this.notifications.unreadCount(ctx.userId, ctx.organisationId);
  }

  @Post('read-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark all my notifications here as read' })
  readAll(@Org() ctx: OrgContext) {
    return this.notifications.markAllRead(ctx.userId, ctx.organisationId);
  }

  @Post(':id/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark one notification as read' })
  read(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.markRead(ctx.userId, id);
  }
}

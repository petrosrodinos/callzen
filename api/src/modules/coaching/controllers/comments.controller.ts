import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { OrgGuard } from '@/shared/guards/org.guard';
import { Org } from '@/shared/decorators/org.decorator';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { CommentsService } from '../services/comments.service';
import { CreateCommentDto, UpdateCommentDto } from '../dto/comment.dto';

// Coach notes on a call. Access follows call access; write rules live in CommentsService.
@ApiTags('Coaching: comments')
@ApiBearerAuth()
@Controller('calls/:id/comments')
@UseGuards(JwtGuard, OrgGuard)
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'Comment threads on a call' })
  list(@Org() ctx: OrgContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.comments.list(ctx, id);
  }

  @Post()
  @ApiOperation({ summary: 'Comment on a call, or reply in a thread' })
  create(
    @Org() ctx: OrgContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.create(ctx, id, dto);
  }

  @Patch(':commentId')
  @ApiOperation({ summary: 'Edit your comment' })
  update(
    @Org() ctx: OrgContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.comments.update(ctx, id, commentId, dto);
  }

  @Delete(':commentId')
  @ApiOperation({ summary: 'Delete a comment (soft delete)' })
  remove(
    @Org() ctx: OrgContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    return this.comments.remove(ctx, id, commentId);
  }
}

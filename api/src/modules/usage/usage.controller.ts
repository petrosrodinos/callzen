import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/shared/pipes/zod.validation.pipe';
import { UsageService } from './usage.service';
import {
  UsageQuerySchema,
  type UsageQueryType,
} from './dto/usage-query.schema';

@ApiTags('Usage')
@ApiBearerAuth()
@Controller('usage')
@UseGuards(JwtGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Usage and estimated cost over a period' })
  @ApiQuery({ name: 'days', required: false })
  summary(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(UsageQuerySchema)) query: UsageQueryType,
  ) {
    return this.usageService.summary(userId, query);
  }
}

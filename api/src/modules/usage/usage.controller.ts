import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import { UsageService } from './usage.service';
import {
  UsageQuerySchema,
  type UsageQueryType,
} from './dto/usage-query.schema';

@ApiTags('Usage')
@ApiBearerAuth()
@Controller('usage')
@UseGuards(JwtGuard, OrgGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Usage and estimated cost over a period' })
  @ApiQuery({ name: 'days', required: false })
  summary(
    @Org() ctx: OrgContext,
    @Query(new ZodValidationPipe(UsageQuerySchema)) query: UsageQueryType,
  ) {
    return this.usageService.summary(ctx, query);
  }
}

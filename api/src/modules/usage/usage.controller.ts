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
import { EntitlementsService } from '@/modules/billing/services/entitlements.service';
import {
  UsageQuerySchema,
  type UsageQueryType,
} from './dto/usage-query.schema';

@ApiTags('Usage')
@ApiBearerAuth()
@Controller('usage')
@UseGuards(JwtGuard, OrgGuard)
export class UsageController {
  constructor(
    private readonly usageService: UsageService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Get('plan')
  @ApiOperation({
    summary:
      'Plan meters: minutes used out of the allowance, caps, bought minutes and limits for this period',
  })
  plan(@Org() ctx: OrgContext) {
    return this.entitlements.getPlanUsage(ctx);
  }

  @Get('summary')
  @ApiOperation({
    summary:
      'Usage minutes and sessions over a period (costs only for platform admins)',
  })
  @ApiQuery({ name: 'days', required: false })
  summary(
    @Org() ctx: OrgContext,
    @Query(new ZodValidationPipe(UsageQuerySchema)) query: UsageQueryType,
  ) {
    return this.usageService.summary(ctx, query);
  }
}

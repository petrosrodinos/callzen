import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { PlansCatalogService } from '../services/plans-catalog.service';

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansCatalog: PlansCatalogService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Plans with their limits, features and prices, plus minute packs',
  })
  list() {
    return this.plansCatalog.list();
  }

  // Public pricing (landing page): the same public AppConfig values (limits, features, analysis visibility) and
  // Stripe amounts. Never includes Stripe price ids or AI costs.
  @Get('public')
  @ApiOperation({ summary: 'Public plan catalog for the pricing page' })
  listPublic() {
    return this.plansCatalog.list();
  }
}

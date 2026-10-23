import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { CatalogService } from './catalog.service';

@ApiTags('Catalog')
@ApiBearerAuth()
@Controller('catalog')
@UseGuards(JwtGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'AI models, voice providers, templates and defaults',
  })
  @ApiQuery({
    name: 'language',
    required: false,
    description: 'Language of the default templates; defaults to the user preference',
  })
  get(
    @CurrentUser('id') userId: string,
    @Query('language') language?: string,
  ) {
    return this.catalogService.get(userId, language);
  }
}

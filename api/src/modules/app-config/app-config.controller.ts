import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  DefaultValuePipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthRole } from 'generated/prisma';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { AppConfigService } from './app-config.service';
import {
  ResetAppConfigDto,
  UpdateAppConfigDto,
} from './dto/update-app-config.dto';

// Platform admins only. SUPPORT has no access for now (decided in review).
@ApiTags('Admin: App config')
@ApiBearerAuth()
@Controller('admin/app-config')
@UseGuards(JwtGuard, RolesGuard)
@Roles(AuthRole.ADMIN, AuthRole.SUPER_ADMIN)
export class AppConfigController {
  constructor(private readonly appConfig: AppConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Every config key with value, version, default and audit info',
  })
  list() {
    return this.appConfig.list();
  }

  @Get(':key')
  @ApiOperation({ summary: 'One config key' })
  findOne(@Param('key') key: string) {
    return this.appConfig.findOne(key);
  }

  @Put(':key')
  @ApiOperation({
    summary: 'Update a key (409 when the version does not match)',
  })
  update(
    @Param('key') key: string,
    @Body() dto: UpdateAppConfigDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.appConfig.set(key as never, dto.value, userId, dto.version);
  }

  @Post(':key/reset')
  @ApiOperation({ summary: 'Reset a key to its registry default' })
  reset(
    @Param('key') key: string,
    @Body() dto: ResetAppConfigDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.appConfig.reset(key, userId, dto.version);
  }

  @Get(':key/history')
  @ApiOperation({ summary: 'Audit trail of a key' })
  @ApiQuery({ name: 'limit', required: false })
  history(
    @Param('key') key: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.appConfig.history(key, limit);
  }
}

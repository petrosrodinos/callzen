import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/shared/guards/jwt.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { DeleteAccountDto, UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Current user profile and preferences' })
  me(@CurrentUser('id') userId: string) {
    return this.usersService.me(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update profile and preferences' })
  update(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(userId, dto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Permanently delete the account and all its data' })
  remove(@CurrentUser('id') userId: string, @Body() dto: DeleteAccountDto) {
    return this.usersService.remove(userId, dto);
  }
}

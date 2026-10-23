import { Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { RecordingStorageModule } from '@/integrations/storage/recordings/recording-storage.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule, RecordingStorageModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

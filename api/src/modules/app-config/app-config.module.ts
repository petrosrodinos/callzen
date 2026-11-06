import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { AppConfigController } from './app-config.controller';
import { AppConfigService } from './app-config.service';

// Global so any service can read runtime configuration.
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AppConfigController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}

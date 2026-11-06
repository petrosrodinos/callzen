import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MailModule } from './modules/internal/mail/mail.module';
import { SmsModule } from './modules/internal/sms/sms.module';
import { AiModule } from './modules/internal/ai/ai.module';
import { RedisModule } from './core/databases/redis/redis.module';
import { QueuesModule } from './core/queues/queues.module';
import { RedisCacheModule } from './modules/internal/redis-cache/redis-cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { ConfigModule } from './shared/config/env/env.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { UsageModule } from './modules/usage/usage.module';
import { AssistantAgentsModule } from './modules/assistant-agents/assistant-agents.module';
import { PracticeAgentsModule } from './modules/practice-agents/practice-agents.module';
import { CallsModule } from './modules/calls/calls.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { OrganisationsModule } from './modules/organisations/organisations.module';
import { AppConfigModule } from './modules/app-config/app-config.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { BillingModule } from './modules/billing/billing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AgentAccessModule } from './modules/agent-access/agent-access.module';
import { CoachingModule } from './modules/coaching/coaching.module';

@Module({
  imports: [
    ConfigModule,
    MailModule,
    SmsModule,
    AiModule,
    RedisModule,
    QueuesModule,
    RedisCacheModule,
    AppConfigModule,
    PricingModule,
    BillingModule,
    NotificationsModule,
    AgentAccessModule,
    // GraphQLModule,
    AuthModule,
    HealthModule,
    OrganisationsModule,
    UsersModule,
    CatalogModule,
    UsageModule,
    AssistantAgentsModule,
    PracticeAgentsModule,
    CallsModule,
    DashboardModule,
    CoachingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/core/databases/prisma/prisma.module';
import { ResendModule } from '@/integrations/notifications/resend/resend.module';
import { RecordingStorageModule } from '@/integrations/storage/recordings/recording-storage.module';
import { OrganisationsController } from './organisations.controller';
import { InvitationsController } from './invitations.controller';
import { OrgAccessService } from './services/org-access.service';
import { OrganisationsService } from './services/organisations.service';
import { MembersService } from './services/members.service';
import { RolesService } from './services/roles.service';
import { InvitationsService } from './services/invitations.service';

// Global so every feature module can use OrgGuard (it needs OrgAccessService and PrismaService).
@Global()
@Module({
  imports: [PrismaModule, ResendModule, RecordingStorageModule],
  controllers: [OrganisationsController, InvitationsController],
  providers: [
    OrgAccessService,
    OrganisationsService,
    MembersService,
    RolesService,
    InvitationsService,
  ],
  exports: [OrgAccessService, OrganisationsService, PrismaModule],
})
export class OrganisationsModule {}

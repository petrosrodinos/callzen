import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { Invitation, InvitationStatus } from 'generated/prisma';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import { ResendMailService } from '@/integrations/notifications/resend/services/mail.service';
import { OrgContext } from '@/shared/interfaces/org-context.interface';
import { EmailConfig } from '@/shared/constants/email';
import { canAssignRole } from '../utils/role-rules.utils';
import { InviteMemberDto } from '../dto/organisation.dto';
import {
  escapeHtml,
  renderInvitationEmail,
} from '../utils/invitation-email.utils';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type InvitationView = 'PENDING' | 'EXPIRED' | 'ACCEPTED' | 'REVOKED';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: ResendMailService,
  ) {}

  // ---------- Managing invitations (organisation scoped) ----------

  async list(ctx: OrgContext) {
    const invitations = await this.prisma.invitation.findMany({
      where: { organisation_id: ctx.organisationId },
      orderBy: { created_at: 'desc' },
      include: { invited_by: { select: { full_name: true, email: true } } },
      take: 200,
    });

    return invitations.map((invitation) =>
      this.serialize(invitation, invitation.invited_by),
    );
  }

  async create(ctx: OrgContext, dto: InviteMemberDto) {
    if (!canAssignRole(ctx.role, dto.role)) {
      throw new ForbiddenException({
        message: 'You can only invite people to a role below your own',
        code: 'ROLE_HIERARCHY',
      });
    }

    const existingMember = await this.prisma.membership.findFirst({
      where: {
        organisation_id: ctx.organisationId,
        user: { email: { equals: dto.email, mode: 'insensitive' } },
      },
    });
    if (existingMember)
      throw new ConflictException({
        message: 'This person is already a member',
        code: 'ALREADY_MEMBER',
      });

    const pending = await this.prisma.invitation.findFirst({
      where: {
        organisation_id: ctx.organisationId,
        email: dto.email,
        status: InvitationStatus.PENDING,
        expires_at: { gt: new Date() },
      },
    });
    if (pending) {
      throw new ConflictException({
        message:
          'This person already has a pending invitation. Resend it instead.',
        code: 'ALREADY_INVITED',
      });
    }

    const token = this.newToken();
    const invitation = await this.prisma.invitation.create({
      data: {
        organisation_id: ctx.organisationId,
        email: dto.email,
        role: dto.role,
        token_hash: this.hash(token),
        invited_by_id: ctx.userId,
        expires_at: new Date(Date.now() + INVITATION_TTL_MS),
      },
      include: { invited_by: { select: { full_name: true, email: true } } },
    });

    return {
      invitation: this.serialize(invitation, invitation.invited_by),
      ...(await this.deliver(invitation, token)),
    };
  }

  // Issues a fresh link (the old one stops working) and emails it again.
  async resend(ctx: OrgContext, invitationId: string) {
    const invitation = await this.getManageable(ctx, invitationId);
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException({
        message: `This invitation was ${invitation.status.toLowerCase()} and cannot be resent. Send a new one.`,
        code: 'NOT_PENDING',
      });
    }

    const token = this.newToken();
    const updated = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        token_hash: this.hash(token),
        expires_at: new Date(Date.now() + INVITATION_TTL_MS),
        last_sent_at: new Date(),
        send_count: { increment: 1 },
      },
      include: { invited_by: { select: { full_name: true, email: true } } },
    });

    return {
      invitation: this.serialize(updated, updated.invited_by),
      ...(await this.deliver(updated, token)),
    };
  }

  async revoke(ctx: OrgContext, invitationId: string) {
    const invitation = await this.getManageable(ctx, invitationId);
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException({
        message: 'Only pending invitations can be revoked',
        code: 'NOT_PENDING',
      });
    }

    const updated = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.REVOKED, revoked_at: new Date() },
      include: { invited_by: { select: { full_name: true, email: true } } },
    });
    return { invitation: this.serialize(updated, updated.invited_by) };
  }

  // ---------- Recipient side (user scoped) ----------

  async preview(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token_hash: this.hash(token) },
      include: {
        organisation: { select: { name: true } },
        invited_by: { select: { full_name: true, email: true } },
      },
    });
    if (!invitation)
      throw new NotFoundException({
        message:
          'This invitation link is invalid or was replaced by a newer one',
        code: 'INVITATION_NOT_FOUND',
      });

    const accountExists = !!(await this.prisma.user.findFirst({
      where: { email: { equals: invitation.email, mode: 'insensitive' } },
      select: { id: true },
    }));
    return {
      organisation_name: invitation.organisation.name,
      email: invitation.email,
      role: invitation.role,
      status: this.viewStatus(invitation),
      invited_by:
        invitation.invited_by?.full_name ||
        invitation.invited_by?.email ||
        null,
      expires_at: invitation.expires_at,
      account_exists: accountExists,
    };
  }

  async mine(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return [];

    const invitations = await this.prisma.invitation.findMany({
      where: {
        email: { equals: user.email, mode: 'insensitive' },
        status: InvitationStatus.PENDING,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
      include: {
        organisation: { select: { name: true } },
        invited_by: { select: { full_name: true, email: true } },
      },
    });

    return invitations.map((invitation) => ({
      id: invitation.id,
      organisation_name: invitation.organisation.name,
      role: invitation.role,
      invited_by:
        invitation.invited_by?.full_name ||
        invitation.invited_by?.email ||
        null,
      expires_at: invitation.expires_at,
    }));
  }

  acceptByToken(userId: string, token: string) {
    return this.accept(userId, { token_hash: this.hash(token) });
  }

  acceptById(userId: string, invitationId: string) {
    return this.accept(userId, { id: invitationId });
  }

  private async accept(
    userId: string,
    where: { token_hash: string } | { id: string },
  ) {
    const [user, invitation] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.invitation.findFirst({
        where,
        include: { organisation: { select: { name: true } } },
      }),
    ]);
    if (!user || !invitation)
      throw new NotFoundException({
        message:
          'This invitation link is invalid or was replaced by a newer one',
        code: 'INVITATION_NOT_FOUND',
      });

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException({
        message: `This invitation was sent to ${invitation.email}. Sign in with that email to accept it.`,
        code: 'EMAIL_MISMATCH',
      });
    }

    const status = this.viewStatus(invitation);
    if (status !== 'PENDING') {
      throw new BadRequestException({
        message: `This invitation is ${status.toLowerCase()}. Ask for a new one.`,
        code: `INVITATION_${status}`,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.membership.upsert({
        where: {
          organisation_id_user_id: {
            organisation_id: invitation.organisation_id,
            user_id: userId,
          },
        },
        create: {
          organisation_id: invitation.organisation_id,
          user_id: userId,
          role: invitation.role,
        },
        // Already a member (e.g. joined another way): keep whichever role is higher? Keep existing, never downgrade.
        update: {},
      });
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          accepted_at: new Date(),
          accepted_by_id: userId,
        },
      });
    });

    return {
      organisation_id: invitation.organisation_id,
      organisation_name: invitation.organisation.name,
      role: invitation.role,
    };
  }

  // ---------- Helpers ----------

  private async getManageable(ctx: OrgContext, invitationId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organisation_id: ctx.organisationId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (!canAssignRole(ctx.role, invitation.role)) {
      throw new ForbiddenException({
        message:
          'You cannot manage invitations for a role equal to or higher than your own',
        code: 'ROLE_HIERARCHY',
      });
    }
    return invitation;
  }

  private viewStatus(
    invitation: Pick<Invitation, 'status' | 'expires_at'>,
  ): InvitationView {
    if (
      invitation.status === InvitationStatus.PENDING &&
      invitation.expires_at < new Date()
    )
      return 'EXPIRED';
    return invitation.status;
  }

  private serialize(
    invitation: Invitation,
    invitedBy?: { full_name: string | null; email: string } | null,
  ) {
    const { token_hash, ...rest } = invitation;
    return {
      ...rest,
      status: this.viewStatus(invitation),
      invited_by: invitedBy?.full_name || invitedBy?.email || null,
    };
  }

  private inviteUrl(token: string) {
    const base = (this.config.get<string>('APP_URL') ?? '').replace(/\/$/, '');
    return `${base}/invite/${token}`;
  }

  // Email delivery is best effort: the link is always returned so it can be shared by hand.
  private async deliver(invitation: Invitation, token: string) {
    const invite_url = this.inviteUrl(token);
    try {
      const [organisation, inviter] = await Promise.all([
        this.prisma.organisation.findUnique({
          where: { id: invitation.organisation_id },
        }),
        invitation.invited_by_id
          ? this.prisma.user.findUnique({
              where: { id: invitation.invited_by_id },
            })
          : null,
      ]);
      const inviterName = inviter?.full_name || inviter?.email || 'A teammate';
      await this.mail.sendEmail({
        to: invitation.email,
        from: EmailConfig.email_addresses.alert,
        subject: `${inviterName} invited you to join ${organisation?.name ?? 'an organisation'} on CallZen`,
        html: renderInvitationEmail({
          inviterName: escapeHtml(inviterName),
          organisationName: escapeHtml(organisation?.name ?? ''),
          role: invitation.role,
          url: invite_url,
        }),
      });
      return { invite_url, email_sent: true };
    } catch (error) {
      this.logger.warn(
        `Invitation email to ${invitation.email} was not sent: ${error?.message}`,
      );
      return { invite_url, email_sent: false };
    }
  }

  private newToken() {
    return randomBytes(32).toString('hex');
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}

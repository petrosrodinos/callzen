import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { RegisterEmailDto } from '../dto/register-email.dto';
import { LoginEmailDto } from '../dto/login-email.dto';
import { PrismaService } from '@/core/databases/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateJwtService } from '@/shared/utils/jwt/jwt.service';
import { AuthRoles } from '../interfaces/auth.interface';
import { WaitlistDto } from '../dto/waitlist.dto';
import { ResendMailService } from '@/integrations/notifications/resend/services/mail.service';
import { EmailConfig } from '@/shared/constants/email';
import { OrgAccessService } from '@/modules/organisations/services/org-access.service';

@Injectable()
export class EmailAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: CreateJwtService,
    private readonly mailService: ResendMailService,
    private readonly orgAccess: OrgAccessService,
  ) {}

  async registerWithEmail(dto: RegisterEmailDto) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: {
          email: dto.email.toLowerCase(),
        },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: dto.email.toLowerCase(),
            full_name: dto.full_name,
            preferred_language: dto.preferred_language,
            password: hashedPassword,
            role: AuthRoles.USER,
          },
        });
        // Everyone starts in a personal organisation they own; invitations add more.
        await this.orgAccess.createPersonalOrganisation(created, tx);
        return created;
      });

      const token = await this.jwtService.signToken({
        id: user.id,
        role: user.role,
      });

      const expires_in = this.jwtService.getExpirationTime(token);

      delete user.password;

      return { access_token: token, expires_in: expires_in, user: user };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException(error.message);
    }
  }

  async loginWithEmail(dto: LoginEmailDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email: dto.email.toLowerCase(),
        },
      });

      if (!user || !user.password) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const password_match = await bcrypt.compare(dto.password, user.password);

      if (!password_match) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const token = await this.jwtService.signToken({
        id: user.id,
        role: user.role,
      });

      const expires_in = this.jwtService.getExpirationTime(token);

      delete user.password;

      return { access_token: token, expires_in: expires_in, user: user };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new BadRequestException(error.message);
    }
  }

  async waitlist(dto: WaitlistDto) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: {
          email: dto.email,
        },
      });

      if (existingUser) {
        return {
          message: 'You are already in the waitlist',
          code: 'WAITLIST_ALREADY_EXISTS',
        };
      }

      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: '',
          role: AuthRoles.USER,
        },
      });

      await this.mailService.sendEmail({
        to: dto.email,
        from: EmailConfig.email_addresses.alert,
        subject: EmailConfig.templates.waitlist.subject,
        template_id: EmailConfig.templates.waitlist.template_id,
      });

      return {
        message: 'You have been successfully added to the waitlist',
        code: 'WAITLIST_SUCCESS',
      };
    } catch (error) {
      throw new BadRequestException('Failed to waitlist user', error.message);
    }
  }
}

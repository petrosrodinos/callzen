import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { OrgRole } from 'generated/prisma';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateOrganisationDto {
  @ApiProperty({ example: 'Acme Sales Team' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;
}

export class UpdateOrganisationDto extends CreateOrganisationDto {}

export class DeleteOrganisationDto {
  @ApiProperty({ description: 'Type the exact organisation name to confirm' })
  @IsString()
  @MaxLength(80)
  confirm_name: string;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'maria@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @ApiProperty({ enum: OrgRole, example: OrgRole.MEMBER })
  @IsEnum(OrgRole)
  role: OrgRole;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: OrgRole })
  @IsEnum(OrgRole)
  role: OrgRole;
}

export class UpdateRolePermissionsDto {
  @ApiProperty({ type: [String], example: ['agents.view', 'calls.create'] })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  permissions: string[];
}

export class AcceptInvitationDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token: string;
}

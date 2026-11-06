import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PlanKey } from 'generated/prisma';

const PAID = [PlanKey.STARTER, PlanKey.PRO, PlanKey.COACH];

export class PlanSelectionDto {
  @ApiProperty({ enum: PAID })
  @IsIn(PAID)
  plan: PlanKey;

  @ApiProperty({ enum: ['month', 'year'] })
  @IsIn(['month', 'year'])
  interval: 'month' | 'year';

  @ApiProperty({ required: false, description: 'Coach only: seats on top of the included ones' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  extra_seats?: number;
}

export class CheckoutDto extends PlanSelectionDto {}

export class ChangePlanDto extends PlanSelectionDto {
  @ApiProperty({
    required: false,
    description: 'Idempotency key (also accepted as the Idempotency-Key header); a double click never double-charges',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotency_key?: string;
}

export class TopupDto {
  @ApiProperty({ example: 'live_100' })
  @IsString()
  @MaxLength(60)
  pack_id: string;

  @ApiProperty({ enum: ['personal', 'team'] })
  @IsIn(['personal', 'team'])
  scope: 'personal' | 'team';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotency_key?: string;
}

export class CancelPlanDto {
  @ApiProperty({ required: false, example: 'too_expensive' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reason?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

// ---------- Admin ----------

export class AssignManualPlanDto {
  @ApiProperty({ enum: PAID })
  @IsIn(PAID)
  plan: PlanKey;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  extra_seats?: number;

  @ApiProperty({ required: false, description: 'ISO date; defaults to one year from now' })
  @IsOptional()
  @IsISO8601()
  period_end?: string;

  @ApiProperty({ description: 'Why this plan was granted (required)' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  note: string;
}

export class GrantCreditsDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  @Max(100000)
  live_minutes: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  @Max(100000)
  practice_minutes: number;

  @ApiProperty({ required: false, description: 'Grant to one member (personal); omit for the team pool' })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ExtendTrialDto {
  @ApiProperty({ example: 14 })
  @IsInt()
  @Min(1)
  @Max(365)
  days: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ApplyDiscountDto {
  @ApiProperty({ example: 'COACH50' })
  @IsString()
  @MaxLength(200)
  coupon_id: string;
}

export class AdminCancelDto {
  @ApiProperty({ enum: ['at_period_end', 'immediate'] })
  @IsIn(['at_period_end', 'immediate'])
  mode: 'at_period_end' | 'immediate';

  @ApiProperty({ required: false, description: 'Immediate only: prorated refund of the unused time' })
  @IsOptional()
  refund?: boolean;

  @ApiProperty({ description: 'The organisation name, typed to confirm' })
  @IsString()
  confirm_name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class RefundInvoiceDto {
  @ApiProperty({ required: false, description: 'Partial refund in cents; full refundable amount when omitted' })
  @IsOptional()
  @IsInt()
  @Min(1)
  amount_cents?: number;

  @ApiProperty({ description: 'The organisation name, typed to confirm' })
  @IsString()
  confirm_name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

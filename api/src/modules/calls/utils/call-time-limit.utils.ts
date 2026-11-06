import { ForbiddenException } from '@nestjs/common';
import {
  CALL_TIME_LIMIT_GRACE_SECONDS,
  PlanErrorCodes,
} from '@/shared/config/plans/plans.config';

// Server backstop for the minutes fixed at call start (§8.3): past started_at + max_duration + grace the
// co-pilot stops answering. Transcript segments are still accepted (offline queue, §14).
export const isPastTimeLimit = (
  call: { started_at: Date; max_duration_seconds: number | null },
  now: Date = new Date(),
): boolean =>
  call.max_duration_seconds != null &&
  now.getTime() >
    call.started_at.getTime() +
      (call.max_duration_seconds + CALL_TIME_LIMIT_GRACE_SECONDS) * 1000;

export const assertWithinTimeLimit = (call: {
  started_at: Date;
  max_duration_seconds: number | null;
}) => {
  if (isPastTimeLimit(call))
    throw new ForbiddenException({
      code: PlanErrorCodes.CALL_TIME_LIMIT,
      message: 'This call has reached the minutes available for it.',
      max_duration_seconds: call.max_duration_seconds,
    });
};

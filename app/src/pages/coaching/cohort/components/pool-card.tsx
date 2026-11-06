import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatMinutes } from "@/lib/format";
import type { Cohort, PoolMeter } from "@/features/coaching/interfaces/coaching.interfaces";

function PoolRow({ label, meter }: { label: string; meter: PoolMeter }) {
    const { t } = useTranslation("coaching");
    const included = meter.included_minutes;
    return (
        <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{label}</span>
                <span className="tabular-nums text-muted-foreground">
                    {included == null
                        ? t("pool.usedUnlimited", { used: formatMinutes(meter.used_minutes) })
                        : t("pool.usedOf", { used: formatMinutes(meter.used_minutes), total: formatMinutes(included) })}
                </span>
            </div>
            {included != null && <Progress value={included ? Math.min(100, (meter.used_minutes / included) * 100) : 0} aria-label={label} />}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {meter.remaining_minutes != null && <span>{t("pool.remaining", { minutes: formatMinutes(meter.remaining_minutes) })}</span>}
                {meter.owner_reserve_minutes != null && (
                    <span>
                        {t("pool.reserve", {
                            left: formatMinutes(meter.owner_reserve_left_minutes ?? 0),
                            total: formatMinutes(meter.owner_reserve_minutes),
                        })}
                    </span>
                )}
                {meter.member_cap_minutes != null && <span>{t("pool.cap", { minutes: formatMinutes(meter.member_cap_minutes) })}</span>}
                {meter.team_credit_minutes > 0 && <span>{t("pool.teamCredits", { minutes: formatMinutes(meter.team_credit_minutes) })}</span>}
            </div>
        </div>
    );
}

// The organisation's pooled minutes and the owner reserve this period (§10.1). Personal bought minutes are
// never shown to coaches.
export function PoolCard({ pool }: { pool: Cohort["pool"] }) {
    const { t } = useTranslation("coaching");
    return (
        <Card className="gap-0 p-5">
            <h2 className="mb-3 font-semibold">{t("pool.title")}</h2>
            <div className="grid gap-5 md:grid-cols-2">
                {pool.shared ? (
                    <PoolRow label={t("pool.shared")} meter={pool.live} />
                ) : (
                    <>
                        <PoolRow label={t("pool.live")} meter={pool.live} />
                        <PoolRow label={t("pool.practice")} meter={pool.practice} />
                    </>
                )}
            </div>
        </Card>
    );
}

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatShortDate } from "@/lib/date";
import { CallKinds } from "@/features/calls/interfaces/calls.interfaces";
import type { DashboardOverview } from "@/features/dashboard/interfaces/dashboard.interfaces";
import { Routes } from "@/routes/routes";

interface ScoreTrendCardProps {
  data: DashboardOverview["score_trend"];
  className?: string;
}

export function ScoreTrendCard({ data, className }: ScoreTrendCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("dashboard");
  const points = useMemo(
    () =>
      data.map((point, index) => ({
        index,
        call_id: point.call_id,
        label: formatShortDate(point.date),
        title: point.title,
        live: point.kind === CallKinds.LIVE ? point.score : null,
        practice: point.kind === CallKinds.PRACTICE ? point.score : null,
      })),
    [data],
  );

  return (
    <Card className={className}>
      <div className="flex items-center justify-between p-5 pb-2">
        <div>
          <h2 className="font-semibold">{t("scoreTrend.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("scoreTrend.subtitle")}
          </p>
        </div>
      </div>
      {points.length < 2 ? (
        <EmptyState
          icon={LineChartIcon}
          title={t("scoreTrend.emptyTitle")}
          description={t("scoreTrend.emptyDescription")}
          className="m-5 mt-2 border-none py-8"
        />
      ) : (
        <div className="h-64 px-2 pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              onClick={(state) => {
                const index = Number(state?.activeTooltipIndex);
                const callId = Number.isFinite(index)
                  ? points[index]?.call_id
                  : undefined;
                if (callId) navigate(Routes.library.detail(callId));
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                minTickGap={24}
                className="fill-muted-foreground"
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                }}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.title ?? ""
                }
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="live"
                name={t("scoreTrend.liveCalls")}
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="practice"
                name={t("scoreTrend.practice")}
                stroke="var(--chart-2)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

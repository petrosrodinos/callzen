import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Clock,
  DollarSign,
  Headphones,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardSkeleton } from "@/components/ui/page-skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUsageSummary } from "@/features/usage/hooks/use-usage";
import { useCatalog } from "@/features/catalog/hooks/use-catalog";
import { UsagePeriodOptions } from "@/config/constants/dropdowns/usage/usage-period.options";
import { getUsageKindLabel } from "@/config/constants/dropdowns/usage/usage-kind.options";
import { getAiModelSpeedLabel } from "@/config/constants/dropdowns/agents/ai-model-speed.options";
import { formatCurrency, formatNumber } from "@/lib/format";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { SettingsNav } from "../../components/settings-nav";

const UsagePage: FC = () => {
  const { t } = useTranslation("settings");
  usePageMetadata({ title: t("nav.usage") });
  const [days, setDays] = useState("30");
  const { data, isPending } = useUsageSummary(Number(days));
  const { data: catalog } = useCatalog();
  const orgWide = usePermissions().can(Permissions.USAGE_VIEW);
  const modelLabel = (id: string) =>
    catalog?.ai_models.find((m) => m.id === id)?.label ??
    catalog?.voice_providers.find((p) => p.id === id)?.label ??
    id;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={t("title")}
        actions={
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-44" aria-label={t("usage.period")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UsagePeriodOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <SettingsNav />
      <p className="mb-4 text-sm text-muted-foreground">
        {orgWide
          ? t("usage.scopeOrg")
          : t("usage.scopeMine")}
      </p>

      {isPending || !data ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label={t("usage.estimatedCost")}
              value={formatCurrency(data.estimated_cost_usd)}
              icon={DollarSign}
              hint={t("usage.listPrices")}
            />
            <StatCard
              label={t("usage.liveMinutes")}
              value={formatNumber(data.live_minutes)}
              icon={Clock}
            />
            <StatCard
              label={t("usage.practiceMinutes")}
              value={formatNumber(data.practice_minutes)}
              icon={Headphones}
            />
            <StatCard
              label={t("usage.analyses")}
              value={data.analyses_count}
              icon={BarChart3}
              hint={t("usage.suggestions", { count: data.suggestions_count })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-3 font-semibold">{t("usage.byActivity")}</h2>
              {!data.by_kind.length ? (
                <p className="text-sm text-muted-foreground">
                  No usage in this period.
                </p>
              ) : (
                <ul className="space-y-2">
                  {[...data.by_kind]
                    .sort((a, b) => b.cost_usd - a.cost_usd)
                    .map((row) => (
                      <li
                        key={row.kind}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span>{getUsageKindLabel(row.kind)}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {row.count} ·{" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(row.cost_usd)}
                          </span>
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </Card>
            <Card className="p-5">
              <h2 className="mb-3 font-semibold">{t("usage.byModel")}</h2>
              {!data.by_model.length ? (
                <p className="text-sm text-muted-foreground">
                  No usage in this period.
                </p>
              ) : (
                <ul className="space-y-2">
                  {[...data.by_model]
                    .sort((a, b) => b.cost_usd - a.cost_usd)
                    .map((row) => (
                      <li
                        key={row.model}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="truncate">
                          {modelLabel(row.model)}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {t("usage.tokens", {
                            tokens: formatNumber(row.input_tokens + row.output_tokens),
                          })}{" "}
                          ·{" "}
                          <span className="font-medium text-foreground">
                            {formatCurrency(row.cost_usd)}
                          </span>
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </Card>
          </div>

          {catalog && (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Sparkles className="size-4 text-primary" /> {t("usage.priceList.title")}
              </h2>
              <p className="mb-3 text-sm text-muted-foreground">
                {t("usage.priceList.description")}
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("usage.priceList.model")}</TableHead>
                      <TableHead>{t("usage.priceList.speed")}</TableHead>
                      <TableHead className="text-right">
                        {t("usage.priceList.input")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("usage.priceList.output")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catalog.ai_models.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">
                          {model.label}
                        </TableCell>
                        <TableCell>
                          {getAiModelSpeedLabel(model.speed)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(model.input_per_million)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(model.output_per_million)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {catalog.voice_providers.map((provider) => (
                      <TableRow key={provider.id}>
                        <TableCell className="font-medium">
                          {provider.label}
                        </TableCell>
                        <TableCell>{provider.latency}</TableCell>
                        <TableCell
                          colSpan={2}
                          className="text-right tabular-nums"
                        >
                          {t("usage.priceList.perMinute", {
                            price: formatCurrency(provider.cost_per_minute_usd),
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default UsagePage;

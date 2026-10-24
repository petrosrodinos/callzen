import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Archive,
  ArchiveRestore,
  Copy,
  Headphones,
  MoreVertical,
  Pencil,
  PhoneCall,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/ui/score-badge";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/date";
import type { AssistantAgent } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import {
  useArchiveAssistantAgent,
  useDeleteAssistantAgent,
  useDuplicateAssistantAgent,
  useSetDefaultAssistantAgent,
} from "@/features/assistant-agents/hooks/use-assistant-agents";
import { getMethodologyLabel } from "@/config/constants/dropdowns/agents/methodology-form.options";
import { getSuggestionFrequencyLabel } from "@/config/constants/dropdowns/agents/suggestion-frequency-form.options";
import { Routes } from "@/routes/routes";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";

export function AssistantAgentCard({ agent }: { agent: AssistantAgent }) {
  const { t } = useTranslation("assistant");
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canManage = can(Permissions.AGENTS_MANAGE);
  const canCall = can(Permissions.CALLS_CREATE);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const duplicate = useDuplicateAssistantAgent();
  const setDefault = useSetDefaultAssistantAgent();
  const archive = useArchiveAssistantAgent();
  const remove = useDeleteAssistantAgent();
  const stats = agent.stats;
  const archived = !!agent.archived_at;

  return (
    <Card className={cn("flex flex-col p-5", archived && "opacity-70")}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
          {agent.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          {canManage ? (
            <Link
              to={Routes.assistant_agents.detail(agent.id)}
              className="line-clamp-1 font-semibold hover:underline"
            >
              {agent.name}
            </Link>
          ) : (
            <span className="line-clamp-1 font-semibold">{agent.name}</span>
          )}
          <div className="mt-1 flex flex-wrap gap-1">
            {agent.is_default && (
              <Badge className="gap-1">
                <Star className="size-3" /> {t("card.default")}
              </Badge>
            )}
            {archived && <Badge variant="secondary">{t("card.archived")}</Badge>}
            {agent.methodology && agent.methodology !== "CUSTOM" && (
              <Badge variant="outline">
                {getMethodologyLabel(agent.methodology)}
              </Badge>
            )}
            {(agent.languages?.length ? agent.languages : [agent.language]).map(
              (code) => (
                <Badge key={code} variant="outline" className="uppercase">
                  {code}
                </Badge>
              ),
            )}
          </div>
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-2 -mt-1 shrink-0"
                aria-label={t("card.actionsFor", { name: agent.name })}
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  navigate(Routes.assistant_agents.detail(agent.id))
                }
              >
                <Pencil /> {t("card.edit")}
              </DropdownMenuItem>
              {!agent.is_default && !archived && (
                <DropdownMenuItem onClick={() => setDefault.mutate(agent.id)}>
                  <Star /> {t("card.makeDefault")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => duplicate.mutate(agent.id)}>
                <Copy /> {t("card.duplicate")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  archive.mutate({ id: agent.id, archived: !archived })
                }
              >
                {archived ? <ArchiveRestore /> : <Archive />}{" "}
                {archived ? t("card.restore") : t("card.archive")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 /> {t("card.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground">
        {agent.description || agent.call_goal || t("card.noDescription")}
      </p>
      {agent.call_goal && (
        <p className="mt-2 line-clamp-1 text-xs">
          <span className="text-muted-foreground">{t("card.goal")}</span> {agent.call_goal}
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-center">
        <div>
          <p className="text-lg font-semibold tabular-nums">
            {stats?.calls_count ?? 0}
          </p>
          <p className="text-[11px] text-muted-foreground">{t("card.calls")}</p>
        </div>
        <div className="flex flex-col items-center">
          <ScoreBadge score={stats?.average_score} className="mt-0.5" />
          <p className="mt-1 text-[11px] text-muted-foreground">{t("card.avgScore")}</p>
        </div>
        <div>
          <p
            className={cn(
              "flex items-center justify-center gap-0.5 text-lg font-semibold tabular-nums",
              (stats?.trend ?? 0) > 0 && "text-emerald-600",
              (stats?.trend ?? 0) < 0 && "text-red-600",
            )}
          >
            {stats?.trend != null ? (
              <>
                {stats.trend > 0 ? (
                  <TrendingUp className="size-4" />
                ) : stats.trend < 0 ? (
                  <TrendingDown className="size-4" />
                ) : null}
                {stats.trend > 0 ? `+${stats.trend}` : stats.trend}
              </>
            ) : (
              "–"
            )}
          </p>
          <p className="text-[11px] text-muted-foreground">{t("card.trend")}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {getSuggestionFrequencyLabel(agent.suggestion_frequency)} ·{" "}
        {stats?.last_used_at
          ? t("card.usedAgo", { when: formatRelative(stats.last_used_at) })
          : t("card.neverUsed")}
      </p>

      {!archived && canCall && (
        <div className="mt-4 flex gap-2">
          <Button asChild size="sm" className="flex-1">
            <Link to={`${Routes.calls.new}?agent=${agent.id}`}>
              <PhoneCall /> {t("card.useOnCall")}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link to={`${Routes.practice.root}?copilot=${agent.id}`}>
              <Headphones /> {t("card.practice")}
            </Link>
          </Button>
        </div>
      )}

      <ConfirmationDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(agent.id, { onSuccess: () => setConfirmDelete(false) })
        }
        title={t("card.deleteTitle", { name: agent.name })}
        description={t("card.deleteDescription")}
        confirmText={t("card.delete")}
        variant="destructive"
        isLoading={remove.isPending}
      />
    </Card>
  );
}

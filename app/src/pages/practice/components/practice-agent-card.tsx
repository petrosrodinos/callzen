import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Archive, ArchiveRestore, ArrowUpRight, CheckCircle2, Copy, History, MoreVertical, Pencil, Play, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/ui/score-badge";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/date";
import type { PracticeAgent } from "@/features/practice-agents/interfaces/practice-agents.interfaces";
import { useArchivePracticeAgent, useDeletePracticeAgent, useDuplicatePracticeAgent, useHarderPracticeAgent } from "@/features/practice-agents/hooks/use-practice-agents";
import { getLeadTemperatureLabel } from "@/config/constants/dropdowns/practice/lead-temperature-form.options";
import { getScenarioTypeLabel } from "@/config/constants/dropdowns/practice/scenario-type-form.options";
import { Routes } from "@/routes/routes";
import { DifficultyDots } from "./difficulty-dots";

export function PracticeAgentCard({ agent, startLink }: { agent: PracticeAgent; startLink: string }) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const duplicate = useDuplicatePracticeAgent();
  const harder = useHarderPracticeAgent();
  const archive = useArchivePracticeAgent();
  const remove = useDeletePracticeAgent();
  const archived = !!agent.archived_at;
  const stats = agent.stats;

  return (
    <Card className={cn("flex flex-col p-5", archived && "opacity-70")}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <Link to={Routes.practice.agent(agent.id)} className="line-clamp-1 font-semibold hover:underline">
            {agent.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {[agent.prospect_name, agent.job_title, agent.company].filter(Boolean).join(" · ") || getScenarioTypeLabel(agent.scenario_type)}
          </p>
        </div>
        <DifficultyDots value={agent.difficulty} className="mt-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-2 -mt-1 shrink-0" aria-label={`Actions for ${agent.name}`}>
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(Routes.practice.agent(agent.id))}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`${Routes.library.root}?practice_agent_id=${agent.id}`)}>
              <History /> Past sessions
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => duplicate.mutate(agent.id)}>
              <Copy /> Duplicate
            </DropdownMenuItem>
            {agent.difficulty < 5 && (
              <DropdownMenuItem onClick={() => harder.mutate(agent.id)}>
                <ArrowUpRight /> Make a harder version
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => archive.mutate({ id: agent.id, archived: !archived })}>
              {archived ? <ArchiveRestore /> : <Archive />} {archived ? "Restore" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground">{agent.role_prompt}</p>

      <div className="mt-3 flex flex-wrap gap-1">
        <Badge variant="secondary">{getLeadTemperatureLabel(agent.lead_temperature)}</Badge>
        <Badge variant="outline">{getScenarioTypeLabel(agent.scenario_type)}</Badge>
        {agent.source_call_id && <Badge variant="outline">From a real call</Badge>}
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span>{stats?.sessions_count ?? 0} sessions</span>
        {stats?.best_score != null && (
          <span className="inline-flex items-center gap-1">
            Best <ScoreBadge score={stats.best_score} className="min-w-8 text-xs" />
          </span>
        )}
        {stats?.objective_rate != null && (
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="size-3.5" /> {stats.objective_rate}%
          </span>
        )}
      </div>
      {stats?.last_practiced_at && <p className="mt-1 text-[11px] text-muted-foreground">Last practiced {formatRelative(stats.last_practiced_at)}</p>}

      {!archived && (
        <Button asChild size="sm" className="mt-4">
          <Link to={startLink}>
            <Play /> {stats?.sessions_count ? "Practice again" : "Start practice"}
          </Link>
        </Button>
      )}

      <ConfirmationDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate(agent.id, { onSuccess: () => setConfirmDelete(false) })}
        title={`Delete ${agent.name}?`}
        description="The prospect is permanently deleted. Past practice sessions stay in your call library."
        confirmText="Delete"
        variant="destructive"
        isLoading={remove.isPending}
      />
    </Card>
  );
}

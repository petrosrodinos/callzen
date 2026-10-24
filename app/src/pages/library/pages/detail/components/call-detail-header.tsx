import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowUpRight,
  FileX2,
  Headphones,
  MoreVertical,
  RefreshCw,
  RotateCcw,
  Trash2,
  UserRoundPlus,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime, formatDuration } from "@/lib/date";
import {
  CallKinds,
  CallStatuses,
  type Call,
  type CallOutcome,
} from "@/features/calls/interfaces/calls.interfaces";
import {
  useDeleteCall,
  useDeleteRecording,
  useDeleteTranscript,
  useUpdateCall,
} from "@/features/calls/hooks/use-calls";
import {
  useCreatePracticeAgentFromCall,
  useHarderPracticeAgent,
} from "@/features/practice-agents/hooks/use-practice-agents";
import { CallOutcomeFormOptions } from "@/config/constants/dropdowns/calls/call-outcome-form.options";
import { getCallTypeLabel } from "@/config/constants/dropdowns/calls/call-type-form.options";
import { getCallEndReasonLabel } from "@/config/constants/dropdowns/calls/call-end-reason.options";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { Routes } from "@/routes/routes";

type ConfirmKind = "call" | "recording" | "transcript" | null;

export function CallDetailHeader({
  call,
  onRerun,
}: {
  call: Call;
  onRerun: () => void;
}) {
  const { t } = useTranslation("library");
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const updateCall = useUpdateCall();
  const deleteCall = useDeleteCall();
  const deleteRecording = useDeleteRecording();
  const deleteTranscript = useDeleteTranscript();
  const fromCall = useCreatePracticeAgentFromCall();
  const harder = useHarderPracticeAgent();
  const isPractice = call.kind === CallKinds.PRACTICE;
  const busy = call.status === CallStatuses.ANALYZING;
  const { can } = usePermissions();
  const canManage = call.owner.is_you || can(Permissions.CALLS_MANAGE_ALL);
  const canPractise = can(Permissions.CALLS_CREATE);
  const canManageProspects = can(Permissions.PROSPECTS_MANAGE);

  const confirmConfig = {
    call: {
      title: t("detail.header.confirm.call.title"),
      description: t("detail.header.confirm.call.description"),
      run: () =>
        deleteCall.mutate(call.id, {
          onSuccess: () => navigate(Routes.library.root, { replace: true }),
        }),
      pending: deleteCall.isPending,
    },
    recording: {
      title: t("detail.header.confirm.recording.title"),
      description: t("detail.header.confirm.recording.description"),
      run: () =>
        deleteRecording.mutate(call.id, { onSuccess: () => setConfirm(null) }),
      pending: deleteRecording.isPending,
    },
    transcript: {
      title: t("detail.header.confirm.transcript.title"),
      description: t("detail.header.confirm.transcript.description"),
      run: () =>
        deleteTranscript.mutate(call.id, { onSuccess: () => setConfirm(null) }),
      pending: deleteTranscript.isPending,
    },
  };
  const active = confirm ? confirmConfig[confirm] : null;

  return (
    <div className="space-y-3">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to={Routes.library.root}>
          <ArrowLeft /> {t("detail.header.back")}
        </Link>
      </Button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {isPractice ? (
              <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
                <Headphones className="size-3" /> {t("detail.header.practice")}
              </Badge>
            ) : (
              <Badge variant="secondary">
                {getCallTypeLabel(call.call_type)}
              </Badge>
            )}
            {call.copilot_enabled && call.agent_snapshot && (
              <Badge variant="outline">
                {t("detail.header.copilot", {
                  name: call.agent_snapshot.name,
                })}
              </Badge>
            )}
            {call.ended_reason && call.ended_reason !== "USER" && (
              <Badge variant="outline">
                {getCallEndReasonLabel(call.ended_reason)}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {call.title ??
              call.prospect_name ??
              (isPractice
                ? t("detail.header.practiceSession")
                : t("detail.header.call"))}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(call.started_at)} ·{" "}
            {formatDuration(call.duration_seconds)}
            {call.prospect_company && ` · ${call.prospect_company}`}
            {!call.owner.is_you &&
              ` · ${t("detail.header.by", { name: call.owner.name })}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isPractice && canManage && (
            <Select
              value={call.outcome ?? undefined}
              onValueChange={(value) =>
                updateCall.mutate({
                  id: call.id,
                  dto: { outcome: value as CallOutcome },
                })
              }
            >
              <SelectTrigger
                className="w-52"
                aria-label={t("detail.header.outcomeLabel")}
              >
                <SelectValue placeholder={t("detail.header.recordOutcome")} />
              </SelectTrigger>
              <SelectContent>
                {CallOutcomeFormOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isPractice &&
            call.practice_agent &&
            canPractise &&
            call.owner.is_you && (
              <Button asChild>
                <Link to={Routes.practice.start(call.practice_agent.id)}>
                  <RotateCcw /> {t("detail.header.retry")}
                </Link>
              </Button>
            )}
          {(canManage || canManageProspects) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("detail.header.moreActions")}
                >
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {canManage && (
                  <DropdownMenuItem
                    onClick={onRerun}
                    disabled={busy || !call.segments.length}
                  >
                    <RefreshCw /> {t("detail.header.rerun")}
                  </DropdownMenuItem>
                )}
                {!isPractice && canManageProspects && (
                  <DropdownMenuItem
                    disabled={fromCall.isPending || !call.segments.length}
                    onClick={() =>
                      fromCall.mutate(call.id, {
                        onSuccess: (agent) =>
                          navigate(Routes.practice.start(agent.id)),
                      })
                    }
                  >
                    <UserRoundPlus />{" "}
                    {fromCall.isPending
                      ? t("detail.header.recreatingProspect")
                      : t("detail.header.practiceWithProspect")}
                  </DropdownMenuItem>
                )}
                {isPractice &&
                  call.practice_agent &&
                  call.practice_agent.difficulty < 5 &&
                  canManageProspects && (
                    <DropdownMenuItem
                      disabled={harder.isPending}
                      onClick={() =>
                        harder.mutate(call.practice_agent!.id, {
                          onSuccess: (agent) =>
                            navigate(Routes.practice.start(agent.id)),
                        })
                      }
                    >
                      <ArrowUpRight /> {t("detail.header.harder")}
                    </DropdownMenuItem>
                  )}
                {canManage && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      {t("detail.header.retention")}
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      disabled={!call.has_recording}
                      onClick={() => setConfirm("recording")}
                    >
                      <VolumeX /> {t("detail.header.deleteRecording")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!call.segments.length || busy}
                      onClick={() => setConfirm("transcript")}
                    >
                      <FileX2 /> {t("detail.header.deleteTranscript")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirm("call")}
                    >
                      <Trash2 /> {t("detail.header.deleteCall")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={!!active}
        onClose={() => setConfirm(null)}
        onConfirm={() => active?.run()}
        title={active?.title ?? ""}
        description={active?.description ?? ""}
        confirmText={t("detail.header.confirm.confirmText")}
        variant="destructive"
        isLoading={active?.pending}
      />
    </div>
  );
}

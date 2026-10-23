import { useMemo, type FC } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Play } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/ui/page-skeletons";
import {
  useCreatePracticeAgent,
  usePracticeAgent,
  useUpdatePracticeAgent,
} from "@/features/practice-agents/hooks/use-practice-agents";
import type { PracticeAgent } from "@/features/practice-agents/interfaces/practice-agents.interfaces";
import { useCatalog } from "@/features/catalog/hooks/use-catalog";
import { useAssistantAgents } from "@/features/assistant-agents/hooks/use-assistant-agents";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { PracticeAgentForm } from "./components/practice-agent-form";
import {
  toPracticeFormValues,
  toPracticePayload,
} from "../../utils/practice-agent-form.utils";
import type { PracticeAgentFormValues } from "../../validation-schemas/practice-agent.schema";

const PracticeAgentEditorPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const location = useLocation();
  const draft = (location.state as { draft?: Partial<PracticeAgent> } | null)
    ?.draft;
  const { data: catalog, isPending: catalogPending } = useCatalog();
  const { data: assistantAgents } = useAssistantAgents({ status: "active" });
  const { data: agent, isPending: agentPending } = usePracticeAgent(id);
  const create = useCreatePracticeAgent();
  const update = useUpdatePracticeAgent();

  usePageMetadata({
    title: isNew ? "New prospect" : (agent?.name ?? "Prospect"),
  });

  const defaults = useMemo(
    () =>
      isNew
        ? toPracticeFormValues(draft)
        : agent
          ? toPracticeFormValues(agent)
          : null,
    [agent, draft, isNew],
  );

  const onSubmit = (values: PracticeAgentFormValues, startAfter: boolean) => {
    const payload = toPracticePayload(values);
    if (isNew) {
      create.mutate(payload, {
        onSuccess: (created) =>
          navigate(
            startAfter
              ? Routes.practice.start(created.id)
              : Routes.practice.agent(created.id),
            { replace: true },
          ),
      });
    } else if (id) {
      update.mutate(
        { id, dto: payload },
        { onSuccess: () => startAfter && navigate(Routes.practice.start(id)) },
      );
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link to={Routes.practice.root}>
          <ArrowLeft /> Practice
        </Link>
      </Button>
      <PageHeader
        title={
          isNew
            ? draft
              ? "Review your generated prospect"
              : "New AI prospect"
            : (agent?.name ?? "Prospect")
        }
        description="Who the prospect is, how they behave, and what they hide. Hidden details are only revealed after the session."
        actions={
          !isNew && (
            <Button asChild>
              <Link to={Routes.practice.start(id as string)}>
                <Play /> Practice
              </Link>
            </Button>
          )
        }
      />
      {catalogPending || (!isNew && agentPending) || !defaults || !catalog ? (
        <FormSkeleton fields={10} />
      ) : (
        <PracticeAgentForm
          key={agent?.id ?? "new"}
          defaultValues={defaults}
          catalog={catalog}
          assistantAgents={assistantAgents ?? []}
          isSaving={create.isPending || update.isPending}
          isNew={isNew}
          onSubmit={onSubmit}
        />
      )}
    </div>
  );
};

export default PracticeAgentEditorPage;

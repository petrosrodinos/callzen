import { useMemo, useState, type FC } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/ui/page-skeletons";
import {
  useAssistantAgent,
  useCreateAssistantAgent,
  useUpdateAssistantAgent,
} from "@/features/assistant-agents/hooks/use-assistant-agents";
import { useCatalog } from "@/features/catalog/hooks/use-catalog";
import type { AssistantAgentTemplate } from "@/features/catalog/interfaces/catalog.interfaces";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { TemplatePicker } from "./components/template-picker";
import { AssistantAgentForm } from "./components/assistant-agent-form";
import { toFormValues, toPayload } from "./utils/assistant-agent-form.utils";
import type { AssistantAgentFormValues } from "../../validation-schemas/assistant-agent.schema";

const AssistantAgentEditorPage: FC = () => {
  const { t } = useTranslation("assistant");
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const { data: catalog, isPending: catalogPending } = useCatalog();
  const { data: agent, isPending: agentPending } = useAssistantAgent(id);
  const [template, setTemplate] = useState<
    AssistantAgentTemplate | "blank" | null
  >(null);
  const create = useCreateAssistantAgent();
  const update = useUpdateAssistantAgent();

  usePageMetadata({
    title: isNew ? t("editor.newTitle") : (agent?.name ?? t("editor.fallbackTitle")),
  });

  const defaults = useMemo(() => {
    if (!catalog) return null;
    if (!isNew) return agent ? toFormValues(agent, catalog) : null;
    if (!template) return null;
    return toFormValues(template === "blank" ? null : template, catalog);
  }, [agent, catalog, isNew, template]);

  const onSubmit = (values: AssistantAgentFormValues) => {
    const payload = toPayload(values);
    if (isNew) {
      create.mutate(
        {
          ...payload,
          template_key:
            template && template !== "blank" ? template.key : undefined,
        },
        {
          onSuccess: (created) =>
            navigate(Routes.assistant_agents.detail(created.id), {
              replace: true,
            }),
        },
      );
    } else if (id) {
      update.mutate({ id, dto: payload });
    }
  };

  const loading = catalogPending || (!isNew && agentPending);

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link to={Routes.assistant_agents.root}>
          <ArrowLeft /> {t("list.title")}
        </Link>
      </Button>
      <PageHeader
        title={isNew ? t("editor.newTitle") : (agent?.name ?? t("editor.fallbackTitle"))}
        description={
          isNew
            ? t("editor.newDescription")
            : t("editor.editDescription")
        }
      />

      {loading ? (
        <FormSkeleton fields={8} />
      ) : isNew && !template ? (
        <TemplatePicker
          templates={catalog?.assistant_templates ?? []}
          onPick={setTemplate}
        />
      ) : defaults && catalog ? (
        <AssistantAgentForm
          key={agent?.id ?? (template === "blank" ? "blank" : template?.key)}
          defaultValues={defaults}
          catalog={catalog}
          onSubmit={onSubmit}
          isSaving={create.isPending || update.isPending}
          submitLabel={isNew ? t("editor.create") : t("editor.save")}
          onBack={isNew ? () => setTemplate(null) : undefined}
        />
      ) : null}
    </div>
  );
};

export default AssistantAgentEditorPage;

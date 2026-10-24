import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Dices, Headphones, Plus, Search, WandSparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { CardGridSkeleton } from "@/components/ui/page-skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreatePracticeAgent,
  usePracticeAgents,
} from "@/features/practice-agents/hooks/use-practice-agents";
import { useCatalog } from "@/features/catalog/hooks/use-catalog";
import type { LeadTemperature } from "@/features/practice-agents/interfaces/practice-agents.interfaces";
import type { PracticeAgentTemplate } from "@/features/catalog/interfaces/catalog.interfaces";
import { LeadTemperatureFilterOptions } from "@/config/constants/dropdowns/practice/lead-temperature-form.options";
import { DifficultyFilterOptions } from "@/config/constants/dropdowns/practice/difficulty-form.options";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Routes } from "@/routes/routes";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { PracticeAgentCard } from "./components/practice-agent-card";
import { TemplateCard } from "./components/template-card";
import { GenerateProspectDialog } from "./components/generate-prospect-dialog";
import { RandomProspectDialog } from "./components/random-prospect-dialog";

const PracticePage: FC = () => {
  const { t } = useTranslation("practice");
  usePageMetadata({ title: t("list.title") });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const copilotId = searchParams.get("copilot");
  const [search, setSearch] = useState("");
  const [temperature, setTemperature] = useState<LeadTemperature | "all">(
    "all",
  );
  const [difficulty, setDifficulty] = useState("all");
  const [dialog, setDialog] = useState<"generate" | "random" | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const { can } = usePermissions();
  const canManage = can(Permissions.PROSPECTS_MANAGE);

  const { data: catalog } = useCatalog();
  const { data: agents, isPending } = usePracticeAgents({
    search: debouncedSearch || undefined,
    lead_temperature: temperature === "all" ? undefined : temperature,
    difficulty: difficulty === "all" ? undefined : Number(difficulty),
  });
  const createAgent = useCreatePracticeAgent();

  const startLink = (agentId: string) =>
    `${Routes.practice.start(agentId)}${copilotId ? `?copilot=${copilotId}` : ""}`;

  const startFromTemplate = (template: PracticeAgentTemplate) => {
    const { key, ...fields } = template;
    createAgent.mutate(
      {
        ...fields,
        template_key: key,
        linked_assistant_agent_id: copilotId ?? undefined,
      },
      { onSuccess: (agent) => navigate(startLink(agent.id)) },
    );
  };

  const filtersActive =
    !!debouncedSearch || temperature !== "all" || difficulty !== "all";

  return (
    <>
      <PageHeader
        title={t("list.title")}
        description={t("list.description")}
        actions={
          canManage && (
            <>
              <Button variant="outline" onClick={() => setDialog("random")}>
                <Dices /> {t("list.random")}
              </Button>
              <Button variant="outline" onClick={() => setDialog("generate")}>
                <WandSparkles /> {t("list.describeOne")}
              </Button>
              <Button asChild>
                <Link to={Routes.practice.agents_new}>
                  <Plus /> {t("list.newProspect")}
                </Link>
              </Button>
            </>
          )
        }
      />

      {canManage && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("list.readyMade")}
          </h2>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {(catalog?.practice_templates ?? []).map((template) => (
              <TemplateCard
                key={template.key}
                template={template}
                onUse={() => startFromTemplate(template)}
                isPending={
                  createAgent.isPending &&
                  createAgent.variables?.template_key === template.key
                }
                disabled={createAgent.isPending}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground sm:mr-auto">
            {t("list.yourProspects")}
          </h2>
          <div className="relative sm:w-56">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("list.search")}
              className="pl-9"
              aria-label={t("list.searchAria")}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Select
              value={temperature}
              onValueChange={(value) =>
                setTemperature(value as LeadTemperature | "all")
              }
            >
              <SelectTrigger className="sm:w-40" aria-label={t("list.leadTemperatureAria")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LeadTemperatureFilterOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="sm:w-40" aria-label={t("list.difficultyAria")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DifficultyFilterOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isPending ? (
          <CardGridSkeleton count={3} />
        ) : !agents?.length ? (
          <EmptyState
            icon={Headphones}
            title={
              filtersActive
                ? t("list.emptyFiltered")
                : t("list.emptyNone")
            }
            description={t("list.emptyDescription")}
            action={
              canManage && (
                <Button onClick={() => setDialog("generate")}>
                  <WandSparkles /> {t("list.describeProspect")}
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <PracticeAgentCard
                key={agent.id}
                agent={agent}
                startLink={startLink(agent.id)}
              />
            ))}
          </div>
        )}
      </section>

      <GenerateProspectDialog
        open={dialog === "generate"}
        onOpenChange={(open) => setDialog(open ? "generate" : null)}
        copilotId={copilotId}
      />
      <RandomProspectDialog
        open={dialog === "random"}
        onOpenChange={(open) => setDialog(open ? "random" : null)}
        copilotId={copilotId}
        onCreated={(id) => navigate(startLink(id))}
      />
    </>
  );
};

export default PracticePage;

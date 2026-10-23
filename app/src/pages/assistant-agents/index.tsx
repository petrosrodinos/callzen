import { useState, type FC } from "react";
import { Link } from "react-router-dom";
import { Bot, Plus, Search } from "lucide-react";
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
import { useAssistantAgents } from "@/features/assistant-agents/hooks/use-assistant-agents";
import { AgentStatusFilterOptions } from "@/config/constants/dropdowns/agents/agent-status-filter.options";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Routes } from "@/routes/routes";
import { AssistantAgentCard } from "./components/assistant-agent-card";

const AssistantAgentsPage: FC = () => {
  usePageMetadata({ title: "Co-pilots" });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "archived" | "all">("active");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { can } = usePermissions();
  const canManage = can(Permissions.AGENTS_MANAGE);
  const { data: agents, isPending } = useAssistantAgents({
    search: debouncedSearch || undefined,
    status,
  });

  return (
    <>
      <PageHeader
        title="Co-pilots"
        description="Each co-pilot has its own script, objection library, knowledge and style. Create one per product, audience or call stage."
        actions={
          canManage && (
            <Button asChild>
              <Link to={Routes.assistant_agents.new}>
                <Plus /> New co-pilot
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search co-pilots"
            className="pl-9"
            aria-label="Search co-pilots"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as typeof status)}
        >
          <SelectTrigger className="sm:w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AgentStatusFilterOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <CardGridSkeleton />
      ) : !agents?.length ? (
        <EmptyState
          icon={Bot}
          title={
            search || status !== "active"
              ? "No co-pilots match"
              : canManage
                ? "Create your first co-pilot"
                : "No co-pilots yet"
          }
          description={
            canManage
              ? "Pick a template like Generic Cold Call or B2B Discovery and tailor it to your product in a couple of minutes."
              : "An admin of this organisation creates the co-pilots you'll use on calls."
          }
          action={
            canManage && (
              <Button asChild>
                <Link to={Routes.assistant_agents.new}>
                  <Plus /> New co-pilot
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <AssistantAgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </>
  );
};

export default AssistantAgentsPage;

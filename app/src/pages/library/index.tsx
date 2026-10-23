import { useEffect, useMemo, useState, type FC } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Library,
  PhoneCall,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/page-skeletons";
import { CallRow } from "@/components/ui/call-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCalls } from "@/features/calls/hooks/use-calls";
import { useAssistantAgents } from "@/features/assistant-agents/hooks/use-assistant-agents";
import type {
  CallKind,
  CallOutcome,
  CallQuery,
  CallType,
} from "@/features/calls/interfaces/calls.interfaces";
import { CallKindFilterOptions } from "@/config/constants/dropdowns/calls/call-kind-filter.options";
import { CallTypeFilterOptions } from "@/config/constants/dropdowns/calls/call-type-filter.options";
import { CallOutcomeFilterOptions } from "@/config/constants/dropdowns/calls/call-outcome-filter.options";
import {
  CallSortOptions,
  DateRangeFilterOptions,
  ScoreRangeFilterOptions,
} from "@/config/constants/dropdowns/calls/call-filters.options";
import { daysAgoIso } from "@/lib/date";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { usePermissions } from "@/features/organisations/hooks/use-organisations";
import { Permissions } from "@/features/organisations/interfaces/organisations.interfaces";
import { Routes } from "@/routes/routes";

const PAGE_SIZE = 20;

const FilterSelect = ({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
  label: string;
  className?: string;
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger aria-label={label} className={className}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map((option) => (
        <SelectItem key={option.id} value={option.id}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const LibraryPage: FC = () => {
  usePageMetadata({ title: "Call library" });
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const debouncedSearch = useDebouncedValue(search, 350);
  const { data: agents } = useAssistantAgents({ status: "all" });
  const { can } = usePermissions();
  const canViewAll = can(Permissions.CALLS_VIEW_ALL);

  const get = (key: string, fallback = "all") => params.get(key) ?? fallback;
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if ((params.get("search") ?? "") !== debouncedSearch)
      update("search", debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const query = useMemo<CallQuery>(() => {
    const [orderBy, direction] = get("sort", "started_at:desc").split(":") as [
      CallQuery["order_by"],
      CallQuery["order_direction"],
    ];
    const score = ScoreRangeFilterOptions.find(
      (option) => option.id === get("score"),
    );
    const range = DateRangeFilterOptions.find(
      (option) => option.id === get("date"),
    );
    return {
      page: Number(get("page", "1")) || 1,
      limit: PAGE_SIZE,
      search: params.get("search") || undefined,
      kind: get("kind") === "all" ? undefined : (get("kind") as CallKind),
      call_type: get("type") === "all" ? undefined : (get("type") as CallType),
      assistant_agent_id: get("agent") === "all" ? undefined : get("agent"),
      practice_agent_id: params.get("practice_agent_id") ?? undefined,
      mine: params.get("whose") === "mine" ? "true" : undefined,
      outcome:
        get("outcome") === "all"
          ? undefined
          : (get("outcome") as CallOutcome | "NONE"),
      min_score: score?.min,
      max_score: score?.max,
      from: range?.days ? daysAgoIso(range.days) : undefined,
      order_by: orderBy,
      order_direction: direction,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const { data, isPending, isFetching } = useCalls(query);
  const activeFilters = [
    "kind",
    "type",
    "agent",
    "outcome",
    "score",
    "date",
    "practice_agent_id",
    "whose",
  ].filter((key) => params.get(key)).length;

  const filters = (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
      {canViewAll && (
        <FilterSelect
          label="Whose calls"
          value={get("whose")}
          onChange={(v) => update("whose", v)}
          options={[
            { id: "all", label: "Everyone's calls" },
            { id: "mine", label: "Only mine" },
          ]}
        />
      )}
      <FilterSelect
        label="Live or practice"
        value={get("kind")}
        onChange={(v) => update("kind", v)}
        options={CallKindFilterOptions}
      />
      <FilterSelect
        label="Call type"
        value={get("type")}
        onChange={(v) => update("type", v)}
        options={CallTypeFilterOptions}
      />
      <FilterSelect
        label="Co-pilot"
        value={get("agent")}
        onChange={(v) => update("agent", v)}
        options={[
          { id: "all", label: "All co-pilots" },
          ...(agents ?? []).map((a) => ({ id: a.id, label: a.name })),
        ]}
      />
      <FilterSelect
        label="Outcome"
        value={get("outcome")}
        onChange={(v) => update("outcome", v)}
        options={CallOutcomeFilterOptions}
      />
      <FilterSelect
        label="Score"
        value={get("score")}
        onChange={(v) => update("score", v)}
        options={ScoreRangeFilterOptions}
      />
      <FilterSelect
        label="Date"
        value={get("date")}
        onChange={(v) => update("date", v)}
        options={DateRangeFilterOptions}
      />
    </div>
  );

  return (
    <>
      <PageHeader
        title="Call library"
        description="Every live call and practice session, with recordings, transcripts and analyses."
        actions={
          <Button asChild>
            <Link to={Routes.calls.new}>
              <PhoneCall /> Start a call
            </Link>
          </Button>
        }
      />

      <Card className="mb-4 space-y-3 p-3 sm:p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by prospect, company or notes"
              className="pl-9"
              aria-label="Search calls"
            />
          </div>
          <FilterSelect
            label="Sort"
            value={get("sort", "started_at:desc")}
            onChange={(v) => update("sort", v)}
            options={CallSortOptions}
            className="hidden w-44 sm:flex"
          />
        </div>
        <div className="hidden md:block">{filters}</div>
        <Collapsible className="md:hidden">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <SlidersHorizontal /> Filters{" "}
              {activeFilters ? `(${activeFilters})` : ""}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-3">
            {filters}
            <FilterSelect
              label="Sort"
              value={get("sort", "started_at:desc")}
              onChange={(v) => update("sort", v)}
              options={CallSortOptions}
            />
          </CollapsibleContent>
        </Collapsible>
        {activeFilters > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setParams(new URLSearchParams(), { replace: true })}
          >
            <X /> Clear filters
          </Button>
        )}
      </Card>

      {isPending ? (
        <ListSkeleton rows={8} />
      ) : !data?.data.length ? (
        <EmptyState
          icon={Library}
          title={
            activeFilters || query.search ? "No calls match" : "No calls yet"
          }
          description={
            activeFilters || query.search
              ? "Try removing some filters."
              : "Your live calls and practice sessions will appear here."
          }
          action={
            !activeFilters && (
              <Button asChild>
                <Link to={Routes.practice.root}>Start practising</Link>
              </Button>
            )
          }
        />
      ) : (
        <Card className={isFetching ? "opacity-70 transition-opacity" : ""}>
          <ul className="divide-y px-2 sm:px-3">
            {data.data.map((call) => (
              <li key={call.id}>
                <CallRow call={call} />
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {data.pagination.total} call
              {data.pagination.total === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={!data.pagination.has_prev}
                onClick={() => update("page", String(query.page! - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft />
              </Button>
              <span className="tabular-nums">
                {data.pagination.page} /{" "}
                {Math.max(1, data.pagination.total_pages)}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={!data.pagination.has_next}
                onClick={() => update("page", String(query.page! + 1))}
                aria-label="Next page"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
};

export default LibraryPage;

import { useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import type { Catalog } from "@/features/catalog/interfaces/catalog.interfaces";
import { assistantAgentSchema, type AssistantAgentFormValues } from "../../../validation-schemas/assistant-agent.schema";
import { BasicsSection } from "./sections/basics-section";
import { ScriptSection } from "./sections/script-section";
import { ObjectionsSection } from "./sections/objections-section";
import { KnowledgeSection } from "./sections/knowledge-section";
import { StyleSection } from "./sections/style-section";
import { ModelsSection } from "./sections/models-section";
import { AnalysisSection } from "./sections/analysis-section";

interface AssistantAgentFormProps {
  defaultValues: AssistantAgentFormValues;
  catalog: Catalog;
  onSubmit: (values: AssistantAgentFormValues) => void;
  isSaving: boolean;
  submitLabel: string;
  onBack?: () => void;
}

const TABS = [
  { id: "basics", label: "Basics", fields: ["name", "description", "call_goal", "language", "methodology"] },
  { id: "script", label: "Script", fields: ["script"] },
  { id: "objections", label: "Objections", fields: ["objection_library"] },
  { id: "knowledge", label: "Knowledge", fields: ["knowledge"] },
  { id: "style", label: "Style", fields: ["instructions", "tone", "suggestion_frequency", "consent_line"] },
  { id: "models", label: "AI models", fields: ["realtime_model", "analysis_model"] },
  { id: "analysis", label: "Scoring", fields: ["analysis_criteria"] },
] as const;

export function AssistantAgentForm({ defaultValues, catalog, onSubmit, isSaving, submitLabel, onBack }: AssistantAgentFormProps) {
  const [tab, setTab] = useState<string>("basics");
  const form = useForm<AssistantAgentFormValues>({
    resolver: zodResolver(assistantAgentSchema),
    defaultValues,
  });

  const onInvalid = (errors: FieldErrors<AssistantAgentFormValues>) => {
    const invalidTab = TABS.find((t) => t.fields.some((field) => field in errors));
    if (invalidTab) setTab(invalidTab.id);
    toast({ title: "Please fix the highlighted fields", variant: "error", duration: 2500 });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max">
              {TABS.map((t) => (
                <TabsTrigger key={t.id} value={t.id}>
                  {t.label}
                  {t.fields.some((field) => field in form.formState.errors) && <span className="ml-1.5 size-1.5 rounded-full bg-destructive" />}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="mt-5">
            <TabsContent value="basics">
              <BasicsSection form={form} languages={catalog.languages} />
            </TabsContent>
            <TabsContent value="script">
              <ScriptSection form={form} />
            </TabsContent>
            <TabsContent value="objections">
              <ObjectionsSection form={form} />
            </TabsContent>
            <TabsContent value="knowledge">
              <KnowledgeSection form={form} />
            </TabsContent>
            <TabsContent value="style">
              <StyleSection form={form} defaultConsentLine={catalog.default_consent_line} />
            </TabsContent>
            <TabsContent value="models">
              <ModelsSection form={form} catalog={catalog} />
            </TabsContent>
            <TabsContent value="analysis">
              <AnalysisSection form={form} defaults={catalog.default_analysis_criteria} />
            </TabsContent>
          </div>
        </Tabs>

        <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t bg-background/95 backdrop-blur sm:-mx-6">
          <div className="pb-safe flex items-center gap-2 px-4 pt-3 sm:px-6">
            {onBack && (
              <Button type="button" variant="ghost" onClick={onBack}>
                <ArrowLeft /> Templates
              </Button>
            )}
            <span className="hidden text-xs text-muted-foreground sm:inline">{form.formState.isDirty ? "Unsaved changes" : ""}</span>
            <Button type="submit" className="ml-auto" disabled={isSaving} loading={isSaving}>
              {!isSaving && <Save />} {submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import type { Catalog } from "@/features/catalog/interfaces/catalog.interfaces";
import {
  assistantAgentSchema,
  type AssistantAgentFormValues,
} from "../../../validation-schemas/assistant-agent.schema";
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
  {
    id: "basics",
    label: i18n.t("assistant:form.tabs.basics"),
    fields: ["name", "description", "call_goal", "languages", "methodology"],
  },
  { id: "script", label: i18n.t("assistant:form.tabs.script"), fields: ["script"] },
  { id: "objections", label: i18n.t("assistant:form.tabs.objections"), fields: ["objection_library"] },
  { id: "knowledge", label: i18n.t("assistant:form.tabs.knowledge"), fields: ["knowledge"] },
  {
    id: "style",
    label: i18n.t("assistant:form.tabs.style"),
    fields: ["instructions", "tone", "suggestion_frequency", "consent_line"],
  },
  {
    id: "models",
    label: i18n.t("assistant:form.tabs.models"),
    fields: ["realtime_model", "analysis_model"],
  },
  { id: "analysis", label: i18n.t("assistant:form.tabs.analysis"), fields: ["analysis_criteria"] },
] as const;

export function AssistantAgentForm({
  defaultValues,
  catalog,
  onSubmit,
  isSaving,
  submitLabel,
  onBack,
}: AssistantAgentFormProps) {
  const { t } = useTranslation("assistant");
  const [tab, setTab] = useState<string>("basics");
  const form = useForm<AssistantAgentFormValues>({
    resolver: zodResolver(assistantAgentSchema),
    defaultValues,
  });

  const onInvalid = (errors: FieldErrors<AssistantAgentFormValues>) => {
    const invalidTab = TABS.find((item) =>
      item.fields.some((field) => field in errors),
    );
    if (invalidTab) setTab(invalidTab.id);
    toast({
      title: t("form.fixFields"),
      variant: "error",
      duration: 2500,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max">
              {TABS.map((item) => (
                <TabsTrigger key={item.id} value={item.id}>
                  {item.label}
                  {item.fields.some((field) => field in form.formState.errors) && (
                    <span className="ml-1.5 size-1.5 rounded-full bg-destructive" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="mt-5">
            <TabsContent value="basics">
              <BasicsSection
                form={form}
                languages={catalog.languages}
                maxLanguages={catalog.max_conversation_languages ?? 5}
              />
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
              <StyleSection
                form={form}
                defaultConsentLine={catalog.default_consent_line}
              />
            </TabsContent>
            <TabsContent value="models">
              <ModelsSection form={form} catalog={catalog} />
            </TabsContent>
            <TabsContent value="analysis">
              <AnalysisSection
                form={form}
                defaults={catalog.default_analysis_criteria}
              />
            </TabsContent>
          </div>
        </Tabs>

        <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t bg-background/95 backdrop-blur sm:-mx-6">
          <div className="pb-safe flex items-center gap-2 px-4 pt-3 sm:px-6">
            {onBack && (
              <Button type="button" variant="ghost" onClick={onBack}>
                <ArrowLeft /> {t("form.templates")}
              </Button>
            )}
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {form.formState.isDirty ? t("form.unsavedChanges") : ""}
            </span>
            <Button
              type="submit"
              className="ml-auto"
              disabled={isSaving}
              loading={isSaving}
            >
              {!isSaving && <Save />} {submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

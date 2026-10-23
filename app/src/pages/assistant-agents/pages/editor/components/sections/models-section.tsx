import type { UseFormReturn } from "react-hook-form";
import { Info } from "lucide-react";
import { FormField, FormItem } from "@/components/ui/form";
import { FormSection } from "@/components/ui/form-section";
import { ModelPicker } from "@/components/ui/model-picker";
import type { Catalog } from "@/features/catalog/interfaces/catalog.interfaces";
import type { AssistantAgentFormValues } from "../../../../validation-schemas/assistant-agent.schema";

export function ModelsSection({ form, catalog }: { form: UseFormReturn<AssistantAgentFormValues>; catalog: Catalog }) {
  return (
    <div className="space-y-4">
      {!catalog.ai_configured && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          <Info className="mt-0.5 size-4 shrink-0" /> AI is not configured on the server yet, so suggestions and analysis are unavailable.
        </p>
      )}
      <FormSection title="Real-time suggestions" description="Speed matters most here: a late suggestion is a useless one.">
        <FormField
          control={form.control}
          name="realtime_model"
          render={({ field }) => (
            <FormItem>
              <ModelPicker name="Real-time model" purpose="realtime" models={catalog.ai_models} recommended={catalog.recommended_realtime_model} value={field.value} onChange={field.onChange} />
            </FormItem>
          )}
        />
      </FormSection>
      <FormSection title="Post-call analysis" description="Analysis can favour depth over speed. If a model is unavailable, CallZen falls back to the recommended one and tells you.">
        <FormField
          control={form.control}
          name="analysis_model"
          render={({ field }) => (
            <FormItem>
              <ModelPicker name="Analysis model" purpose="analysis" models={catalog.ai_models} recommended={catalog.recommended_analysis_model} value={field.value} onChange={field.onChange} />
            </FormItem>
          )}
        />
      </FormSection>
    </div>
  );
}

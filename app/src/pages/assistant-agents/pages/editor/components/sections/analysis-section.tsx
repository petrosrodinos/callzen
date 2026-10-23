import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import type { AnalysisCriterion } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import { slugify } from "../../utils/assistant-agent-form.utils";
import type { AssistantAgentFormValues } from "../../../../validation-schemas/assistant-agent.schema";

export function AnalysisSection({
  form,
  defaults,
}: {
  form: UseFormReturn<AssistantAgentFormValues>;
  defaults: AnalysisCriterion[];
}) {
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "analysis_criteria",
  });
  const criteria = form.watch("analysis_criteria");
  const totalWeight = criteria.reduce(
    (sum, criterion) => sum + (Number(criterion.weight) || 0),
    0,
  );

  return (
    <FormSection
      title="Scoring categories"
      description="What the post-call analysis scores and how much each category counts toward the overall score."
      actions={
        <>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => replace(defaults)}
          >
            <RotateCcw /> Reset
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              append({ key: `custom_${Date.now()}`, label: "", weight: 1 })
            }
          >
            <Plus /> Add category
          </Button>
        </>
      }
    >
      <ul className="space-y-2">
        {fields.map((field, index) => {
          const weight = Number(criteria[index]?.weight) || 0;
          const share = totalWeight
            ? Math.round((weight / totalWeight) * 100)
            : 0;
          return (
            <li
              key={field.id}
              className="flex flex-wrap items-start gap-2 rounded-lg border p-2 sm:flex-nowrap"
            >
              <FormField
                control={form.control}
                name={`analysis_criteria.${index}.label`}
                render={({ field: labelField }) => (
                  <FormItem className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <FormControl>
                      <Input
                        aria-label="Category name"
                        {...labelField}
                        onBlur={(event) => {
                          labelField.onBlur();
                          const key = form.getValues(
                            `analysis_criteria.${index}.key`,
                          );
                          if (key.startsWith("custom_") && event.target.value)
                            form.setValue(
                              `analysis_criteria.${index}.key`,
                              slugify(event.target.value),
                            );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`analysis_criteria.${index}.weight`}
                render={({ field: weightField }) => (
                  <FormItem className="w-24">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.5"
                        min={0}
                        max={5}
                        aria-label="Weight"
                        value={weightField.value}
                        onChange={(event) =>
                          weightField.onChange(
                            event.target.value === ""
                              ? 0
                              : Number(event.target.value),
                          )
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <span className="w-12 pt-2 text-right text-xs tabular-nums text-muted-foreground">
                {share}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                disabled={fields.length <= 1}
                aria-label="Remove category"
              >
                <Trash2 />
              </Button>
            </li>
          );
        })}
      </ul>
      {form.formState.errors.analysis_criteria?.root && (
        <p className="text-sm text-destructive">
          {form.formState.errors.analysis_criteria.root.message}
        </p>
      )}
    </FormSection>
  );
}

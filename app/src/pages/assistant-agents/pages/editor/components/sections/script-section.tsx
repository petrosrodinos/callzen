import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, ListOrdered, Plus, Trash2 } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSection } from "@/components/ui/form-section";
import { EmptyState } from "@/components/ui/empty-state";
import { ScriptStageFormOptions } from "@/config/constants/dropdowns/agents/script-stage-form.options";
import { createClientId } from "@/lib/format";
import type { AssistantAgentFormValues } from "../../../../validation-schemas/assistant-agent.schema";

export function ScriptSection({
  form,
}: {
  form: UseFormReturn<AssistantAgentFormValues>;
}) {
  const { t } = useTranslation("assistant");
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "script",
  });

  const addStage = () =>
    append({
      id: createClientId().slice(0, 8),
      stage: "DISCOVERY",
      title: "",
      content: "",
    });

  return (
    <FormSection
      title={t("script.title")}
      description={t("script.description")}
      actions={
        <Button type="button" size="sm" variant="outline" onClick={addStage}>
          <Plus /> {t("script.addStage")}
        </Button>
      }
    >
      {!fields.length ? (
        <EmptyState
          icon={ListOrdered}
          title={t("script.emptyTitle")}
          description={t("script.emptyDescription")}
          action={
            <Button type="button" size="sm" onClick={addStage}>
              <Plus /> {t("script.addFirstStage")}
            </Button>
          }
        />
      ) : (
        <ol className="space-y-3">
          {fields.map((field, index) => (
            <li key={field.id} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <FormField
                  control={form.control}
                  name={`script.${index}.stage`}
                  render={({ field: stageField }) => (
                    <FormItem className="w-40 shrink-0 space-y-0">
                      <Select
                        value={stageField.value}
                        onValueChange={stageField.onChange}
                      >
                        <FormControl>
                          <SelectTrigger aria-label={t("script.stageType")}>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ScriptStageFormOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`script.${index}.title`}
                  render={({ field: titleField }) => (
                    <FormItem className="min-w-0 flex-1 space-y-0">
                      <FormControl>
                        <Input
                          placeholder={t("script.stageTitlePlaceholder")}
                          aria-label={t("script.stageTitle")}
                          {...titleField}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                    aria-label={t("script.moveUp")}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, index + 1)}
                    aria-label={t("script.moveDown")}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    aria-label={t("script.remove")}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <FormField
                control={form.control}
                name={`script.${index}.content`}
                render={({ field: contentField }) => (
                  <FormItem>
                    <FormLabel className="sr-only">{t("script.whatToSay")}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder={t("script.contentPlaceholder")}
                        {...contentField}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </li>
          ))}
        </ol>
      )}
    </FormSection>
  );
}

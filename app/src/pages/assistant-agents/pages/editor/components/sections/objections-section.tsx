import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Plus, ShieldQuestion, Trash2 } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { EmptyState } from "@/components/ui/empty-state";
import { createClientId } from "@/lib/format";
import type { AssistantAgentFormValues } from "../../../../validation-schemas/assistant-agent.schema";

export function ObjectionsSection({
  form,
}: {
  form: UseFormReturn<AssistantAgentFormValues>;
}) {
  const { t } = useTranslation("assistant");
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "objection_library",
  });
  const add = () =>
    append({ id: createClientId().slice(0, 8), objection: "", response: "" });

  return (
    <FormSection
      title={t("objections.title")}
      description={t("objections.description")}
      actions={
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus /> {t("objections.add")}
        </Button>
      }
    >
      {!fields.length ? (
        <EmptyState
          icon={ShieldQuestion}
          title={t("objections.emptyTitle")}
          description={t("objections.emptyDescription")}
          action={
            <Button type="button" size="sm" onClick={add}>
              <Plus /> {t("objections.add")}
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {fields.map((field, index) => (
            <li key={field.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name={`objection_library.${index}.objection`}
                  render={({ field: objectionField }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder={t("objections.objectionPlaceholder")}
                          aria-label={t("objections.objection")}
                          {...objectionField}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  aria-label={t("objections.remove")}
                >
                  <Trash2 />
                </Button>
              </div>
              <FormField
                control={form.control}
                name={`objection_library.${index}.response`}
                render={({ field: responseField }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder={t("objections.responsePlaceholder")}
                        aria-label={t("objections.response")}
                        {...responseField}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </li>
          ))}
        </ul>
      )}
    </FormSection>
  );
}

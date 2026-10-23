import { useFieldArray, type UseFormReturn } from "react-hook-form";
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
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "objection_library",
  });
  const add = () =>
    append({ id: createClientId().slice(0, 8), objection: "", response: "" });

  return (
    <FormSection
      title="Objection library"
      description="Common objections and the responses you prefer. When the prospect raises one, the co-pilot recognises it and suggests your answer, adapted to the moment."
      actions={
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus /> Add objection
        </Button>
      }
    >
      {!fields.length ? (
        <EmptyState
          icon={ShieldQuestion}
          title="No objections yet"
          description='Add the ones you hear most: "too expensive", "send me an email", "we already have a provider"…'
          action={
            <Button type="button" size="sm" onClick={add}>
              <Plus /> Add objection
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
                          placeholder='Objection, e.g. "It is too expensive"'
                          aria-label="Objection"
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
                  aria-label="Remove objection"
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
                        placeholder="Your preferred response"
                        aria-label="Response"
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

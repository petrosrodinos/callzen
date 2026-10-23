import { useFieldArray, type UseFormReturn } from "react-hook-form";
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
      title="Script"
      description="Organise your script in stages. The co-pilot follows it, tracks progress live, and adapts when the conversation goes elsewhere."
      actions={
        <Button type="button" size="sm" variant="outline" onClick={addStage}>
          <Plus /> Add stage
        </Button>
      }
    >
      {!fields.length ? (
        <EmptyState
          icon={ListOrdered}
          title="No script yet"
          description="Without a script the co-pilot relies on your goal, instructions and knowledge."
          action={
            <Button type="button" size="sm" onClick={addStage}>
              <Plus /> Add first stage
            </Button>
          }
        />
      ) : (
        <ol className="space-y-3">
          {fields.map((field, index) => (
            <li key={field.id} className="space-y-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-end gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <FormField
                  control={form.control}
                  name={`script.${index}.stage`}
                  render={({ field: stageField }) => (
                    <FormItem className="w-40">
                      <Select
                        value={stageField.value}
                        onValueChange={stageField.onChange}
                      >
                        <FormControl>
                          <SelectTrigger aria-label="Stage type">
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
                    <FormItem className="min-w-40 flex-1">
                      <FormControl>
                        <Input
                          placeholder="Stage title (optional)"
                          aria-label="Stage title"
                          {...titleField}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                    aria-label="Move up"
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, index + 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    aria-label="Remove stage"
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
                    <FormLabel className="sr-only">What to say</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="What to say or ask in this stage. Use {placeholders} for names."
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

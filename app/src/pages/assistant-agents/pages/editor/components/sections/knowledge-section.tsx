import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { UseFormReturn } from "react-hook-form";
import { FileUp } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { toast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/format";
import type { AssistantAgentFormValues } from "../../../../validation-schemas/assistant-agent.schema";

const MAX_KNOWLEDGE = 60000;
const ACCEPTED = ".txt,.md,.markdown,.csv,.json,.html,.htm";

export function KnowledgeSection({
  form,
}: {
  form: UseFormReturn<AssistantAgentFormValues>;
}) {
  const { t } = useTranslation("assistant");
  const inputRef = useRef<HTMLInputElement>(null);
  const knowledge = form.watch("knowledge");

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const parts: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: t("knowledge.tooLarge", { name: file.name }),
          description: t("knowledge.tooLargeHint"),
          variant: "error",
        });
        continue;
      }
      let text = await file.text();
      if (/\.html?$/i.test(file.name))
        text =
          new DOMParser().parseFromString(text, "text/html").body.textContent ??
          "";
      parts.push(`## ${file.name}\n${text.trim()}`);
    }
    if (!parts.length) return;
    const next = [form.getValues("knowledge"), ...parts]
      .filter(Boolean)
      .join("\n\n");
    form.setValue("knowledge", next.slice(0, MAX_KNOWLEDGE), {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (next.length > MAX_KNOWLEDGE)
      toast({
        title: t("knowledge.trimmed"),
        description: t("knowledge.trimmedHint", { max: formatNumber(MAX_KNOWLEDGE) }),
        variant: "warning",
      });
    else
      toast({
        title: t("knowledge.imported", { count: parts.length }),
        duration: 2000,
      });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <FormSection
      title={t("knowledge.title")}
      description={t("knowledge.description")}
      actions={
        <>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={(event) => void importFiles(event.target.files)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            <FileUp /> {t("knowledge.import")}
          </Button>
        </>
      }
    >
      <FormField
        control={form.control}
        name="knowledge"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Textarea
                rows={14}
                className="font-mono text-xs leading-relaxed"
                placeholder={t("knowledge.placeholder")}
                {...field}
              />
            </FormControl>
            <FormDescription className="flex justify-between">
              <span>{t("knowledge.importHint")}</span>
              <span className="tabular-nums">
                {formatNumber(knowledge?.length ?? 0)} /{" "}
                {formatNumber(MAX_KNOWLEDGE)}
              </span>
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormSection>
  );
}

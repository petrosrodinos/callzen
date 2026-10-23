import { useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { FileUp } from "lucide-react";
import { FormControl, FormDescription, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { toast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/format";
import type { AssistantAgentFormValues } from "../../../../validation-schemas/assistant-agent.schema";

const MAX_KNOWLEDGE = 60000;
const ACCEPTED = ".txt,.md,.markdown,.csv,.json,.html,.htm";

export function KnowledgeSection({ form }: { form: UseFormReturn<AssistantAgentFormValues> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const knowledge = form.watch("knowledge");

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const parts: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: `${file.name} is too large`, description: "Files up to 2 MB are supported.", variant: "error" });
        continue;
      }
      let text = await file.text();
      if (/\.html?$/i.test(file.name)) text = new DOMParser().parseFromString(text, "text/html").body.textContent ?? "";
      parts.push(`## ${file.name}\n${text.trim()}`);
    }
    if (!parts.length) return;
    const next = [form.getValues("knowledge"), ...parts].filter(Boolean).join("\n\n");
    form.setValue("knowledge", next.slice(0, MAX_KNOWLEDGE), { shouldDirty: true, shouldValidate: true });
    if (next.length > MAX_KNOWLEDGE) toast({ title: "Knowledge was trimmed", description: "Only the first 60,000 characters are kept.", variant: "warning" });
    else toast({ title: `Imported ${parts.length} file${parts.length > 1 ? "s" : ""}`, duration: 2000 });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <FormSection
      title="Knowledge & context"
      description="Product details, pricing, FAQs, competitor comparisons, case studies, ideal customer profile. Used for answers and key info cards during calls."
      actions={
        <>
          <input ref={inputRef} type="file" accept={ACCEPTED} multiple className="hidden" onChange={(event) => void importFiles(event.target.files)} />
          <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            <FileUp /> Import documents
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
                placeholder={"Product: …\nPricing: Starter $99/month per location, 50 seats $399/month\nKey benefit: reduces no-shows by 30%\nCompetitors: …\nFAQ: …"}
                {...field}
              />
            </FormControl>
            <FormDescription className="flex justify-between">
              <span>Imports .txt, .md, .csv, .json and .html files.</span>
              <span className="tabular-nums">
                {formatNumber(knowledge?.length ?? 0)} / {formatNumber(MAX_KNOWLEDGE)}
              </span>
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormSection>
  );
}

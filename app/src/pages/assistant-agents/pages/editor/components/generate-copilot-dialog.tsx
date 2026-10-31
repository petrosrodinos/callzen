import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WandSparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useGenerateAssistantAgent } from "@/features/assistant-agents/hooks/use-assistant-agents";
import type { AssistantAgentDraft } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import {
  generateAssistantAgentSchema,
  type GenerateAssistantAgentFormValues,
} from "../../../validation-schemas/assistant-agent.schema";

interface GenerateCopilotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (draft: AssistantAgentDraft) => void;
}

export function GenerateCopilotDialog({
  open,
  onOpenChange,
  onGenerated,
}: GenerateCopilotDialogProps) {
  const { t } = useTranslation("assistant");
  const examples = [
    t("generateDialog.examples.one"),
    t("generateDialog.examples.two"),
    t("generateDialog.examples.three"),
  ];
  const generate = useGenerateAssistantAgent();
  const form = useForm<GenerateAssistantAgentFormValues>({
    resolver: zodResolver(generateAssistantAgentSchema),
    defaultValues: { description: "" },
  });

  const onSubmit = (values: GenerateAssistantAgentFormValues) =>
    generate.mutate(
      { description: values.description },
      {
        onSuccess: (draft) => {
          onOpenChange(false);
          form.reset();
          onGenerated(draft);
        },
      },
    );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !generate.isPending && onOpenChange(next)}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("generateDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("generateDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      rows={5}
                      autoFocus
                      placeholder={examples[0]}
                      aria-label={t("generateDialog.descriptionAria")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-1.5">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() =>
                    form.setValue("description", example, {
                      shouldValidate: true,
                    })
                  }
                  className="rounded-full border px-2.5 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
                >
                  {example}
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={generate.isPending}
                loading={generate.isPending}
              >
                {!generate.isPending && <WandSparkles />}{" "}
                {generate.isPending
                  ? t("generateDialog.generating")
                  : t("generateDialog.generate")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

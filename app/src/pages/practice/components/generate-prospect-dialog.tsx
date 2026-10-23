import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { WandSparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useGeneratePracticeAgent } from "@/features/practice-agents/hooks/use-practice-agents";
import { generateFromDescriptionSchema, type GenerateFromDescriptionFormValues } from "../validation-schemas/practice-agent.schema";
import { Routes } from "@/routes/routes";

const EXAMPLES = [
  "A skeptical IT manager at a 200-person bank who just renewed with a competitor",
  "A small restaurant owner being cold-called about a POS system, rushed during lunch",
  "A couple looking for a 3-bedroom house in the suburbs with a limited budget",
];

interface GenerateProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copilotId: string | null;
}

export function GenerateProspectDialog({ open, onOpenChange, copilotId }: GenerateProspectDialogProps) {
  const navigate = useNavigate();
  const generate = useGeneratePracticeAgent();
  const form = useForm<GenerateFromDescriptionFormValues>({ resolver: zodResolver(generateFromDescriptionSchema), defaultValues: { description: "" } });

  const onSubmit = (values: GenerateFromDescriptionFormValues) =>
    generate.mutate(
      { description: values.description, assistant_agent_id: copilotId ?? undefined },
      {
        onSuccess: (draft) => {
          onOpenChange(false);
          form.reset();
          navigate(Routes.practice.agents_new, { state: { draft } });
        },
      },
    );

  return (
    <Dialog open={open} onOpenChange={(next) => !generate.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Describe a prospect</DialogTitle>
          <DialogDescription>One sentence is enough. CallZen fills in personality, objections, hidden pain points and conditions to convert. You review before saving.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea rows={3} autoFocus placeholder={EXAMPLES[0]} aria-label="Prospect description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((example) => (
                <button key={example} type="button" onClick={() => form.setValue("description", example, { shouldValidate: true })} className="rounded-full border px-2.5 py-1 text-left text-xs text-muted-foreground hover:bg-muted">
                  {example}
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={generate.isPending} loading={generate.isPending}>
                {!generate.isPending && <WandSparkles />} {generate.isPending ? "Generating…" : "Generate"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

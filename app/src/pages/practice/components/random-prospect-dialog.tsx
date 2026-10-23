import { useState } from "react";
import { Dices } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRandomizePracticeAgent } from "@/features/practice-agents/hooks/use-practice-agents";
import type { LeadTemperature } from "@/features/practice-agents/interfaces/practice-agents.interfaces";
import { LeadTemperatureFilterOptions } from "@/config/constants/dropdowns/practice/lead-temperature-form.options";
import { DifficultyFilterOptions } from "@/config/constants/dropdowns/practice/difficulty-form.options";
import { ScenarioTypeFormOptions } from "@/config/constants/dropdowns/practice/scenario-type-form.options";

interface RandomProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copilotId: string | null;
  onCreated: (id: string) => void;
}

export function RandomProspectDialog({ open, onOpenChange, copilotId, onCreated }: RandomProspectDialogProps) {
  const randomize = useRandomizePracticeAgent();
  const [temperature, setTemperature] = useState<LeadTemperature | "all">("all");
  const [difficulty, setDifficulty] = useState("all");
  const [scenario, setScenario] = useState("any");
  const [industry, setIndustry] = useState("");

  const generate = () =>
    randomize.mutate(
      {
        lead_temperature: temperature === "all" ? undefined : temperature,
        difficulty: difficulty === "all" ? undefined : Number(difficulty),
        scenario_type: scenario === "any" ? undefined : scenario,
        industry: industry.trim() || undefined,
        assistant_agent_id: copilotId ?? undefined,
        save: true,
      },
      {
        onSuccess: (agent) => {
          onOpenChange(false);
          onCreated(agent.id);
        },
      },
    );

  return (
    <Dialog open={open} onOpenChange={(next) => !randomize.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Random prospect</DialogTitle>
          <DialogDescription>Get a surprise prospect within your limits, so you can't memorise the scenario.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="random-temperature">Lead</Label>
            <Select value={temperature} onValueChange={(value) => setTemperature(value as LeadTemperature | "all")}>
              <SelectTrigger id="random-temperature">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LeadTemperatureFilterOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="random-difficulty">Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger id="random-difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DifficultyFilterOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="random-scenario">Scenario</Label>
            <Select value={scenario} onValueChange={setScenario}>
              <SelectTrigger id="random-scenario">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any scenario</SelectItem>
                {ScenarioTypeFormOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="random-industry">Industry</Label>
            <Input id="random-industry" value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="Any" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={generate} disabled={randomize.isPending} loading={randomize.isPending}>
            {!randomize.isPending && <Dices />} {randomize.isPending ? "Generating…" : "Generate & practice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dices } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function RandomProspectDialog({
  open,
  onOpenChange,
  copilotId,
  onCreated,
}: RandomProspectDialogProps) {
  const { t } = useTranslation("practice");
  const randomize = useRandomizePracticeAgent();
  const [temperature, setTemperature] = useState<LeadTemperature | "all">(
    "all",
  );
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
    <Dialog
      open={open}
      onOpenChange={(next) => !randomize.isPending && onOpenChange(next)}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("randomDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("randomDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="random-temperature">{t("randomDialog.lead")}</Label>
            <Select
              value={temperature}
              onValueChange={(value) =>
                setTemperature(value as LeadTemperature | "all")
              }
            >
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
            <Label htmlFor="random-difficulty">{t("randomDialog.difficulty")}</Label>
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
            <Label htmlFor="random-scenario">{t("randomDialog.scenario")}</Label>
            <Select value={scenario} onValueChange={setScenario}>
              <SelectTrigger id="random-scenario">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("randomDialog.anyScenario")}</SelectItem>
                {ScenarioTypeFormOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="random-industry">{t("randomDialog.industry")}</Label>
            <Input
              id="random-industry"
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              placeholder={t("randomDialog.industryPlaceholder")}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={generate}
            disabled={randomize.isPending}
            loading={randomize.isPending}
          >
            {!randomize.isPending && <Dices />}{" "}
            {randomize.isPending
              ? t("randomDialog.generating")
              : t("randomDialog.generateAndPractice")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

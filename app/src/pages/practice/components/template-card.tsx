import { Loader2, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PracticeAgentTemplate } from "@/features/catalog/interfaces/catalog.interfaces";
import { getLeadTemperatureLabel } from "@/config/constants/dropdowns/practice/lead-temperature-form.options";
import { getDifficultyLabel } from "@/config/constants/dropdowns/practice/difficulty-form.options";
import { DifficultyDots } from "./difficulty-dots";

interface TemplateCardProps {
  template: PracticeAgentTemplate;
  onUse: () => void;
  isPending: boolean;
  disabled: boolean;
}

export function TemplateCard({
  template,
  onUse,
  isPending,
  disabled,
}: TemplateCardProps) {
  return (
    <Card className="flex w-72 shrink-0 snap-start flex-col p-4 sm:w-auto">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium leading-tight">{template.name}</p>
        <DifficultyDots value={template.difficulty} />
      </div>
      <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-muted-foreground">
        {template.description}
      </p>
      <div className="mt-3 flex flex-wrap gap-1">
        <Badge
          variant={
            template.lead_temperature === "COLD" ? "secondary" : "outline"
          }
        >
          {getLeadTemperatureLabel(template.lead_temperature)}
        </Badge>
        <Badge variant="outline">
          {getDifficultyLabel(template.difficulty)}
        </Badge>
      </div>
      <Button size="sm" className="mt-3" onClick={onUse} disabled={disabled}>
        {isPending ? <Loader2 className="animate-spin" /> : <Play />} Practice
        this
      </Button>
    </Card>
  );
}

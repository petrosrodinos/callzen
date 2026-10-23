import { Check, Gauge, Globe, Star, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { AiModel } from "@/features/catalog/interfaces/catalog.interfaces";
import { getAiModelSpeedLabel, RelativeCostLabels } from "@/config/constants/dropdowns/agents/ai-model-speed.options";

interface ModelPickerProps {
  models: AiModel[];
  value: string;
  recommended: string;
  onChange: (id: string) => void;
  purpose: "realtime" | "analysis";
  name: string;
}

export function ModelPicker({ models, value, recommended, onChange, purpose, name }: ModelPickerProps) {
  const ordered = [...models].sort((a, b) => Number(b.id === recommended) - Number(a.id === recommended));

  return (
    <div role="radiogroup" aria-label={name} className="grid gap-2 sm:grid-cols-2">
      {ordered.map((model) => {
        const selected = model.id === value;
        const tooSlow = purpose === "realtime" && !model.realtime_suitable;
        return (
          <button
            key={model.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(model.id)}
            className={cn(
              "relative flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected && "border-primary bg-primary/5 ring-1 ring-primary",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{model.label}</span>
              {model.id === recommended && (
                <Badge className="gap-1 bg-primary/10 text-primary shadow-none hover:bg-primary/10">
                  <Star className="size-3" /> Recommended
                </Badge>
              )}
              {selected && <Check className="ml-auto size-4 text-primary" />}
            </div>
            <p className="text-xs text-muted-foreground">{model.description}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Gauge className="size-3" /> {getAiModelSpeedLabel(model.speed)}
              </span>
              <span className="inline-flex items-center gap-1" title={`Quality ${model.quality}/5`}>
                <Star className="size-3" /> {"★".repeat(model.quality)}
                <span className="opacity-40">{"★".repeat(5 - model.quality)}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Wallet className="size-3" /> {RelativeCostLabels[model.relative_cost]}
              </span>
              <span className="inline-flex items-center gap-1">
                <Globe className="size-3" /> {model.languages}
              </span>
            </div>
            {tooSlow && <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Thinks before answering, so suggestions may arrive late on live calls.</p>}
          </button>
        );
      })}
    </div>
  );
}

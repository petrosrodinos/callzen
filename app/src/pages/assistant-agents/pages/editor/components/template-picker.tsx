import { FilePlus2, LayoutTemplate, WandSparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AssistantAgentTemplate } from "@/features/catalog/interfaces/catalog.interfaces";
import { getMethodologyLabel } from "@/config/constants/dropdowns/agents/methodology-form.options";

interface TemplatePickerProps {
  templates: AssistantAgentTemplate[];
  onPick: (template: AssistantAgentTemplate | "blank") => void;
  onGenerate: () => void;
}

export function TemplatePicker({
  templates,
  onPick,
  onGenerate,
}: TemplatePickerProps) {
  const { t } = useTranslation("assistant");
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={onGenerate}
        className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl sm:col-span-2"
      >
        <Card className="flex h-full items-center gap-3 border-primary/40 bg-primary/5 p-4 transition-colors hover:border-primary">
          <WandSparkles className="size-5 shrink-0 text-primary" />
          <div>
            <span className="font-medium">{t("templates.generate")}</span>
            <p className="text-sm text-muted-foreground">
              {t("templates.generateHint")}
            </p>
          </div>
        </Card>
      </button>
      {templates.map((template) => (
        <button
          key={template.key}
          type="button"
          onClick={() => onPick(template)}
          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        >
          <Card className="h-full p-4 transition-colors hover:border-primary/50 hover:bg-primary/5">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="size-4 text-primary" />
              <span className="font-medium">{template.name}</span>
              {template.methodology && template.methodology !== "CUSTOM" && (
                <Badge variant="outline" className="ml-auto">
                  {getMethodologyLabel(template.methodology)}
                </Badge>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {template.description}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("templates.stats", {
                stages: t("templates.stages", { count: template.script.length }),
                objections: t("templates.objections", {
                  count: template.objection_library.length,
                }),
                goal: template.call_goal,
              })}
            </p>
          </Card>
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPick("blank")}
        className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      >
        <Card className="flex h-full flex-col items-center justify-center gap-2 border-dashed p-6 text-center transition-colors hover:border-primary/50">
          <FilePlus2 className="size-5 text-muted-foreground" />
          <span className="font-medium">{t("templates.scratch")}</span>
          <span className="text-sm text-muted-foreground">
            {t("templates.scratchHint")}
          </span>
        </Card>
      </button>
    </div>
  );
}

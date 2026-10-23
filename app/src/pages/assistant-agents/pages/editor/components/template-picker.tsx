import { FilePlus2, LayoutTemplate } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AssistantAgentTemplate } from "@/features/catalog/interfaces/catalog.interfaces";
import { getMethodologyLabel } from "@/config/constants/dropdowns/agents/methodology-form.options";

interface TemplatePickerProps {
  templates: AssistantAgentTemplate[];
  onPick: (template: AssistantAgentTemplate | "blank") => void;
}

export function TemplatePicker({ templates, onPick }: TemplatePickerProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              {template.script.length} script stages ·{" "}
              {template.objection_library.length} objections · Goal:{" "}
              {template.call_goal}
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
          <span className="font-medium">Start from scratch</span>
          <span className="text-sm text-muted-foreground">
            Write your own script and rules
          </span>
        </Card>
      </button>
    </div>
  );
}

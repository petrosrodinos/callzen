import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ModelPicker } from "@/components/ui/model-picker";
import { useCatalog } from "@/features/catalog/hooks/use-catalog";
import { useRerunAnalysis } from "@/features/calls/hooks/use-calls";

interface RerunAnalysisDialogProps {
  callId: string;
  currentModel: string | undefined;
  canUseCurrentCriteria: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RerunAnalysisDialog({
  callId,
  currentModel,
  canUseCurrentCriteria,
  open,
  onOpenChange,
}: RerunAnalysisDialogProps) {
  const { t } = useTranslation("library");
  const { data: catalog } = useCatalog();
  const rerun = useRerunAnalysis();
  const [selectedModel, setModel] = useState(currentModel ?? "");
  const [useCurrentCriteria, setUseCurrentCriteria] = useState(false);
  const model = selectedModel || catalog?.recommended_analysis_model || "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !rerun.isPending && onOpenChange(next)}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("detail.rerun.title")}</DialogTitle>
          <DialogDescription>{t("detail.rerun.description")}</DialogDescription>
        </DialogHeader>
        {catalog && (
          <ModelPicker
            name={t("detail.rerun.modelName")}
            purpose="analysis"
            models={catalog.ai_models}
            recommended={catalog.recommended_analysis_model}
            value={model}
            onChange={setModel}
          />
        )}
        {canUseCurrentCriteria && (
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <Label htmlFor="current-criteria">
                {t("detail.rerun.useCurrent")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("detail.rerun.useCurrentHint")}
              </p>
            </div>
            <Switch
              id="current-criteria"
              checked={useCurrentCriteria}
              onCheckedChange={setUseCurrentCriteria}
            />
          </div>
        )}
        <DialogFooter>
          <Button
            onClick={() =>
              rerun.mutate(
                {
                  id: callId,
                  dto: { model, use_current_criteria: useCurrentCriteria },
                },
                { onSuccess: () => onOpenChange(false) },
              )
            }
            disabled={!model || rerun.isPending}
            loading={rerun.isPending}
          >
            {!rerun.isPending && <RefreshCw />} {t("detail.rerun.title")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

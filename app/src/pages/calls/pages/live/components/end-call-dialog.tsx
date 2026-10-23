import { useState } from "react";
import { PhoneOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CallOutcomes, type CallOutcome } from "@/features/calls/interfaces/calls.interfaces";
import { CallOutcomeFormOptions } from "@/config/constants/dropdowns/calls/call-outcome-form.options";

interface EndCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (outcome?: CallOutcome, customOutcome?: string) => void;
  isPending: boolean;
}

export function EndCallDialog({ open, onOpenChange, onConfirm, isPending }: EndCallDialogProps) {
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [custom, setCustom] = useState("");

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>End the call?</DialogTitle>
          <DialogDescription>Optionally record how it went. Outcomes link your performance to real results.</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Call outcome" className="grid grid-cols-2 gap-2">
          {CallOutcomeFormOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={outcome === option.id}
              onClick={() => setOutcome(outcome === option.id ? null : option.id)}
              className={cn("rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:border-primary/50", outcome === option.id && "border-primary bg-primary/5 font-medium ring-1 ring-primary")}
            >
              {option.label}
            </button>
          ))}
        </div>
        {outcome === CallOutcomes.CUSTOM && <Input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Describe the outcome" aria-label="Custom outcome" autoFocus />}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Keep talking
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(outcome ?? undefined, outcome === CallOutcomes.CUSTOM ? custom.trim() || undefined : undefined)} disabled={isPending} loading={isPending}>
            {!isPending && <PhoneOff />} End call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

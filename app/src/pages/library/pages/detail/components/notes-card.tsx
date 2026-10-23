import { useState } from "react";
import { NotebookPen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateCall } from "@/features/calls/hooks/use-calls";

export function NotesCard({ callId, notes }: { callId: string; notes: string | null }) {
  const [value, setValue] = useState(notes ?? "");
  const update = useUpdateCall();
  const dirty = value !== (notes ?? "");

  return (
    <Card className="space-y-3 p-5">
      <h3 className="flex items-center gap-2 font-semibold">
        <NotebookPen className="size-4 text-primary" /> Personal notes
      </h3>
      <Textarea value={value} onChange={(event) => setValue(event.target.value)} rows={4} placeholder="Anything to remember about this call…" aria-label="Personal notes" />
      <div className="flex justify-end">
        <Button size="sm" disabled={!dirty || update.isPending} loading={update.isPending} onClick={() => update.mutate({ id: callId, dto: { user_notes: value } })}>
          Save notes
        </Button>
      </div>
    </Card>
  );
}

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Speakers, type Speaker } from "@/features/calls/interfaces/calls.interfaces";

// Lets the rep type what was said when audio capture or transcription is not available.
export function ManualLineInput({ onAdd }: { onAdd: (speaker: Speaker, text: string) => void }) {
  const [speaker, setSpeaker] = useState<Speaker>(Speakers.PROSPECT);
  const [text, setText] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    onAdd(speaker, text.trim());
    setText("");
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <div className="flex shrink-0 rounded-md border p-0.5" role="radiogroup" aria-label="Who said it">
        {[Speakers.PROSPECT, Speakers.USER].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={speaker === value}
            onClick={() => setSpeaker(value)}
            className={cn("flex-1 rounded px-2.5 py-1 text-xs font-medium text-muted-foreground", speaker === value && "bg-primary text-primary-foreground")}
          >
            {value === Speakers.PROSPECT ? "Prospect said" : "I said"}
          </button>
        ))}
      </div>
      <div className="flex flex-1 gap-2">
        <Input value={text} onChange={(event) => setText(event.target.value)} placeholder="Type a line from the conversation" aria-label="Add a transcript line" className="h-9" />
        <Button type="submit" size="icon" className="size-9 shrink-0" disabled={!text.trim()} aria-label="Add line">
          <Plus />
        </Button>
      </div>
    </form>
  );
}

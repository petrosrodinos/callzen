import { useState } from "react";
import { Check, Copy, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export function FollowUpCard({ draft, prospectEmailSubject }: { draft: string | null; prospectEmailSubject: string }) {
  const [text, setText] = useState(draft ?? "");
  const [copied, setCopied] = useState(false);

  if (!draft) return <p className="py-8 text-center text-sm text-muted-foreground">No follow-up message was suggested for this call.</p>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed", description: "Select the text and copy it manually.", variant: "error" });
    }
  };

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Draft follow-up</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void copy()}>
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
          <Button asChild size="sm">
            <a href={`mailto:?subject=${encodeURIComponent(prospectEmailSubject)}&body=${encodeURIComponent(text)}`}>
              <Mail /> Open in email
            </a>
          </Button>
        </div>
      </div>
      <Textarea value={text} onChange={(event) => setText(event.target.value)} rows={12} aria-label="Follow-up message" className="leading-relaxed" />
    </Card>
  );
}

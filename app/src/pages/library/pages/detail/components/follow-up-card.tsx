import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export function FollowUpCard({
  draft,
  prospectEmailSubject,
}: {
  draft: string | null;
  prospectEmailSubject: string;
}) {
  const { t } = useTranslation("library");
  const [text, setText] = useState(draft ?? "");
  const [copied, setCopied] = useState(false);

  if (!draft)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t("detail.followUp.empty")}
      </p>
    );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        title: t("detail.followUp.copyFailed"),
        description: t("detail.followUp.copyFailedDescription"),
        variant: "error",
      });
    }
  };

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{t("detail.followUp.title")}</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void copy()}>
            {copied ? <Check /> : <Copy />}{" "}
            {copied ? t("detail.followUp.copied") : t("detail.followUp.copy")}
          </Button>
          <Button asChild size="sm">
            <a
              href={`mailto:?subject=${encodeURIComponent(prospectEmailSubject)}&body=${encodeURIComponent(text)}`}
            >
              <Mail /> {t("detail.followUp.openInEmail")}
            </a>
          </Button>
        </div>
      </div>
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={12}
        aria-label={t("detail.followUp.label")}
        className="leading-relaxed"
      />
    </Card>
  );
}

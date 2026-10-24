import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";

export function HighlightsCard({ highlights }: { highlights: string[] }) {
  const { t } = useTranslation("dashboard");
  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Sparkles className="size-4 text-primary" /> {t("highlights.title")}
      </h2>
      {highlights.length ? (
        <ul className="mt-4 space-y-3">
          {highlights.map((highlight) => (
            <li
              key={highlight}
              className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed"
            >
              {highlight}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("highlights.empty")}
        </p>
      )}
    </Card>
  );
}

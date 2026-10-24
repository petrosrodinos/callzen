import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getDifficultyLabel } from "@/config/constants/dropdowns/practice/difficulty-form.options";

export function DifficultyDots({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const { t } = useTranslation("practice");
  return (
    <span
      className={cn("inline-flex shrink-0 gap-0.5", className)}
      title={t("difficultyDots.title", { label: getDifficultyLabel(value) })}
      aria-label={t("difficultyDots.aria", { value })}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-3 w-1.5 rounded-sm",
            i < value
              ? value >= 4
                ? "bg-red-500"
                : value === 3
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}

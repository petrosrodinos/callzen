import { AlertTriangle, Bell, CircleHelp, Flag, HandMetal, Lightbulb, MessageCircleQuestion, ShieldCheck, Sparkles, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SuggestionTypes, type SuggestionType } from "@/features/calls/interfaces/calls.interfaces";
import { getSuggestionTypeLabel } from "@/config/constants/dropdowns/calls/suggestion-type.options";

const TYPE_STYLES: Record<SuggestionType, { className: string; icon: LucideIcon }> = {
  [SuggestionTypes.OPENER]: { className: "bg-sky-500/10 text-sky-700 dark:text-sky-300", icon: HandMetal },
  [SuggestionTypes.DISCOVERY_QUESTION]: { className: "bg-violet-500/10 text-violet-700 dark:text-violet-300", icon: MessageCircleQuestion },
  [SuggestionTypes.OBJECTION_RESPONSE]: { className: "bg-orange-500/10 text-orange-700 dark:text-orange-300", icon: ShieldCheck },
  [SuggestionTypes.VALUE_STATEMENT]: { className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300", icon: Sparkles },
  [SuggestionTypes.BUYING_SIGNAL]: { className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: Target },
  [SuggestionTypes.NEXT_STEP]: { className: "bg-teal-500/10 text-teal-700 dark:text-teal-300", icon: Flag },
  [SuggestionTypes.REMINDER]: { className: "bg-amber-500/10 text-amber-700 dark:text-amber-300", icon: Bell },
  [SuggestionTypes.WARNING]: { className: "bg-red-500/10 text-red-700 dark:text-red-300", icon: AlertTriangle },
  [SuggestionTypes.CONSENT]: { className: "bg-slate-500/10 text-slate-700 dark:text-slate-300", icon: CircleHelp },
  [SuggestionTypes.ANSWER]: { className: "bg-primary/10 text-primary", icon: Lightbulb },
};

export function SuggestionTypeBadge({ type, className }: { type: SuggestionType; className?: string }) {
  const style = TYPE_STYLES[type] ?? TYPE_STYLES.ANSWER;
  const Icon = style.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", style.className, className)}>
      <Icon className="size-3.5" />
      {getSuggestionTypeLabel(type)}
    </span>
  );
}

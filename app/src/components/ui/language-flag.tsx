import type { FlagComponent } from "country-flag-icons/react/3x2";
import { GB, GR, ES, FR, DE, IT, PT, NL, PL, RO, TR, SE, SA, IN, JP, CN } from "country-flag-icons/react/3x2";
import { cn } from "@/lib/utils";

const FLAGS: Record<string, FlagComponent> = { GB, GR, ES, FR, DE, IT, PT, NL, PL, RO, TR, SE, SA, IN, JP, CN };

// SVG flags: emoji flags do not render on Windows.
export function LanguageFlag({ country, className }: { country: string; className?: string }) {
  const Flag = FLAGS[country];
  if (!Flag) return null;
  return <Flag aria-hidden className={cn("h-3.5 w-5 shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.1)]", className)} />;
}

import { AudioLines } from "lucide-react";
import { cn } from "@/lib/utils";
import { environments } from "@/config/environments";

interface BrandLogoProps {
  className?: string;
  invert?: boolean;
  compact?: boolean;
}

export function BrandLogo({ className, invert = false, compact = false }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", invert ? "bg-white/15 text-white" : "bg-primary text-primary-foreground")}>
        <AudioLines className="size-4.5" />
      </span>
      {!compact && <span className="text-lg">{environments.APP_NAME}</span>}
    </span>
  );
}

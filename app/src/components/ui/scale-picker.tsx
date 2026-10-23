import { cn } from "@/lib/utils";

interface ScalePickerProps {
  value: number;
  onChange: (value: number) => void;
  options: { id: number; label: string; description?: string }[];
  ariaLabel: string;
}

// 1–5 segmented control used for difficulty and patience.
export function ScalePicker({ value, onChange, options, ariaLabel }: ScalePickerProps) {
  const current = options.find((option) => option.id === value);
  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label={ariaLabel} className="grid grid-cols-5 gap-1 rounded-lg bg-muted p-1">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={value === option.id}
            aria-label={option.label}
            onClick={() => onChange(option.id)}
            className={cn("rounded-md py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground", value === option.id && "bg-background text-foreground shadow")}
          >
            {option.id}
          </button>
        ))}
      </div>
      {current && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{current.label}.</span> {current.description}
        </p>
      )}
    </div>
  );
}

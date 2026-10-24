import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageFlag } from "@/components/ui/language-flag";
import { PreferredLanguageOptions } from "@/config/constants/dropdowns/users/preferred-language.options";

interface LanguageSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
  // Limits the list to these language codes (default: every supported language).
  codes?: readonly string[];
  // Non-language choices shown first, e.g. "Auto-detect".
  leadingOptions?: { id: string; label: string }[];
}

export function LanguageSelect({ value, onValueChange, ariaLabel, disabled, codes, leadingOptions = [] }: LanguageSelectProps) {
  const { t } = useTranslation("common");
  const options = codes ? PreferredLanguageOptions.filter((option) => codes.includes(option.id)) : PreferredLanguageOptions;
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel ?? t("languageSelect.label")}>
        <SelectValue placeholder={t("languageSelect.placeholder")} />
      </SelectTrigger>
      <SelectContent>
        {leadingOptions.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            <span className="flex items-center gap-2">
              <Globe className="size-3.5 shrink-0 text-muted-foreground" />
              {option.label}
            </span>
          </SelectItem>
        ))}
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            <span className="flex items-center gap-2">
              <LanguageFlag country={option.flag} />
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

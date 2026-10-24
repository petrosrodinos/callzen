import { useTranslation } from "react-i18next";
import { getLanguageName } from "@/lib/language-name";
import { useState } from "react";
import { Check, ChevronsUpDown, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { LanguageFlag } from "@/components/ui/language-flag";
import { getLanguageFlag } from "@/config/constants/dropdowns/users/preferred-language.options";
import type { Language } from "@/features/catalog/interfaces/catalog.interfaces";

interface LanguageMultiSelectProps {
  languages: Language[];
  value: string[];
  onChange: (value: string[]) => void;
  max: number;
  ariaLabel: string;
}

// Ordered multi-select: the first language is the primary one (starred) and can be changed by clicking another chip's star.
export function LanguageMultiSelect({ languages, value, onChange, max, ariaLabel }: LanguageMultiSelectProps) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const nameOf = (code: string) => getLanguageName(code, languages.find((language) => language.code === code)?.name);
  const atMax = value.length >= max;

  const toggle = (code: string) => {
    if (value.includes(code)) {
      if (value.length > 1) onChange(value.filter((item) => item !== code));
      return;
    }
    if (!atMax) onChange([...value, code]);
  };

  const makePrimary = (code: string) => onChange([code, ...value.filter((item) => item !== code)]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((code, index) => (
          <Badge key={code} variant={index === 0 ? "default" : "secondary"} className="gap-1 py-1 pl-2 pr-1 text-xs">
            <button type="button" onClick={() => makePrimary(code)} disabled={index === 0} className="inline-flex items-center gap-1 disabled:cursor-default" title={index === 0 ? t("languageMultiSelect.primaryLanguage") : t("languageMultiSelect.makePrimary")} aria-label={index === 0 ? t("languageMultiSelect.primaryAria", { name: nameOf(code) }) : t("languageMultiSelect.makePrimaryAria", { name: nameOf(code) })}>
              {index === 0 && <Star className="size-3 fill-current" />}
              <LanguageFlag country={getLanguageFlag(code) ?? ""} />
              {nameOf(code)}
            </button>
            {value.length > 1 && (
              <button type="button" onClick={() => toggle(code)} className="rounded-sm p-0.5 hover:bg-black/10" aria-label={t("languageMultiSelect.removeAria", { name: nameOf(code) })}>
                <X className="size-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-label={ariaLabel} className="w-full justify-between font-normal sm:w-72">
            {atMax ? t("languageMultiSelect.maximum", { count: max }) : t("languageMultiSelect.add")}
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder={t("languageMultiSelect.search")} />
            <CommandList>
              <CommandEmpty>{t("languageMultiSelect.empty")}</CommandEmpty>
              <CommandGroup>
                {languages.map((language) => {
                  const selected = value.includes(language.code);
                  const disabled = !selected && atMax;
                  return (
                    <CommandItem key={language.code} value={`${getLanguageName(language.code, language.name)} ${language.name}`} disabled={disabled} onSelect={() => toggle(language.code)}>
                      <Check className={cn("size-4", selected ? "opacity-100" : "opacity-0")} />
                      <LanguageFlag country={getLanguageFlag(language.code) ?? ""} />
                      {getLanguageName(language.code, language.name)}
                      {value[0] === language.code && <span className="ml-auto text-xs text-muted-foreground">{t("languageMultiSelect.primary")}</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">
        {t("languageMultiSelect.hint", { count: max })}
      </p>
    </div>
  );
}

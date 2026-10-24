import { IconCheck, IconLanguage } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LanguageFlag } from "@/components/ui/language-flag";
import { UiLanguages } from "@/i18n/languages";
import { changeLanguage } from "@/i18n";

// Switches the interface language (distinct from the call/conversation languages chosen on agents).
export function UiLanguageSwitch({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const active = i18n.resolvedLanguage;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("scale-95 rounded-full", className)}>
          <IconLanguage className="size-[1.2rem]" />
          <span className="sr-only">{t("language.switch")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
        {UiLanguages.map((language) => (
          <DropdownMenuItem key={language.code} onClick={() => void changeLanguage(language.code)}>
            <LanguageFlag country={language.flag} />
            {language.label}
            <IconCheck size={14} className={cn("ml-auto", active !== language.code && "hidden")} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

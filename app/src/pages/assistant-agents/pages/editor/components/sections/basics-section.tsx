import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSection } from "@/components/ui/form-section";
import { LanguageMultiSelect } from "@/components/ui/language-multi-select";
import type { Language } from "@/features/catalog/interfaces/catalog.interfaces";
import { MethodologyFormOptions } from "@/config/constants/dropdowns/agents/methodology-form.options";
import type { AssistantAgentFormValues } from "../../../../validation-schemas/assistant-agent.schema";

interface BasicsSectionProps {
  form: UseFormReturn<AssistantAgentFormValues>;
  languages: Language[];
  maxLanguages: number;
}

export function BasicsSection({
  form,
  languages,
  maxLanguages,
}: BasicsSectionProps) {
  const { t } = useTranslation("assistant");
  return (
    <FormSection
      title={t("basics.title")}
      description={t("basics.description")}
    >
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("basics.name")}</FormLabel>
            <FormControl>
              <Input placeholder={t("basics.namePlaceholder")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("basics.purpose")}</FormLabel>
            <FormControl>
              <Textarea
                rows={2}
                placeholder={t("basics.purposePlaceholder")}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="call_goal"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("basics.callGoal")}</FormLabel>
            <FormControl>
              <Input placeholder={t("basics.callGoalPlaceholder")} {...field} />
            </FormControl>
            <FormDescription>
              {t("basics.callGoalHint")}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="languages"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{t("basics.languages")}</FormLabel>
              <LanguageMultiSelect
                ariaLabel={t("basics.languages")}
                languages={languages}
                value={field.value}
                onChange={field.onChange}
                max={maxLanguages}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="methodology"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("basics.methodology")}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MethodologyFormOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="is_default"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <FormLabel>{t("basics.default")}</FormLabel>
              <FormDescription>
                {t("basics.defaultHint")}
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </FormSection>
  );
}

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
import { cn } from "@/lib/utils";
import { ToneFormOptions } from "@/config/constants/dropdowns/agents/tone-form.options";
import {
  SuggestionFrequencyDescriptionOptions,
  SuggestionFrequencyFormOptions,
} from "@/config/constants/dropdowns/agents/suggestion-frequency-form.options";
import { SuggestionLengthFormOptions } from "@/config/constants/dropdowns/agents/suggestion-length-form.options";
import { AlternativesCountFormOptions } from "@/config/constants/dropdowns/agents/alternatives-form.options";
import type { AssistantAgentFormValues } from "../../../../validation-schemas/assistant-agent.schema";

export function StyleSection({
  form,
  defaultConsentLine,
}: {
  form: UseFormReturn<AssistantAgentFormValues>;
  defaultConsentLine: string;
}) {
  const { t } = useTranslation("assistant");
  const suggestConsent = form.watch("suggest_consent_line");

  return (
    <div className="space-y-4">
      <FormSection
        title={t("style.instructionsTitle")}
        description={t("style.instructionsDescription")}
      >
        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("style.instructions")}</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder={t("style.instructionsPlaceholder")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("style.tone")}</FormLabel>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-label={t("style.tone")}
              >
                {ToneFormOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={field.value === option.id}
                    onClick={() => field.onChange(option.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors hover:border-primary/50",
                      field.value === option.id &&
                        "border-primary bg-primary text-primary-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection
        title={t("style.suggestionsTitle")}
        description={t("style.suggestionsDescription")}
      >
        <FormField
          control={form.control}
          name="suggestion_frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("style.frequency")}</FormLabel>
              <div
                className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                role="radiogroup"
                aria-label={t("style.suggestionFrequency")}
              >
                {SuggestionFrequencyFormOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={field.value === option.id}
                    onClick={() => field.onChange(option.id)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors hover:border-primary/50",
                      field.value === option.id &&
                        "border-primary bg-primary/5 ring-1 ring-primary",
                    )}
                  >
                    <span className="block text-sm font-medium">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {SuggestionFrequencyDescriptionOptions[option.id]}
                    </span>
                  </button>
                ))}
              </div>
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="suggestion_length"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("style.length")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SuggestionLengthFormOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="alternatives_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("style.alternatives")}</FormLabel>
                <Select
                  value={String(field.value)}
                  onValueChange={(value) => field.onChange(Number(value))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {AlternativesCountFormOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>
      </FormSection>

      <FormSection
        title={t("style.consentTitle")}
        description={t("style.consentDescription")}
      >
        <FormField
          control={form.control}
          name="suggest_consent_line"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <FormLabel>{t("style.suggestConsent")}</FormLabel>
                <FormDescription>
                  {t("style.suggestConsentHint")}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        {suggestConsent && (
          <FormField
            control={form.control}
            name="consent_line"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("style.consentLine")}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder={defaultConsentLine}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {t("style.consentLineHint")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </FormSection>
    </div>
  );
}

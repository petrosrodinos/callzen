import { useEffect, type FC } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FormSection } from "@/components/ui/form-section";
import { FormSelectField } from "@/components/ui/form-select-field";
import { FormSkeleton } from "@/components/ui/page-skeletons";
import { LanguageSelect } from "@/components/ui/language-select";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { UiLanguageSwitch } from "@/components/ui/ui-language-switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useMe, useUpdateMe } from "@/features/user/hooks/use-user";
import { OutputLanguageModeFormOptions } from "@/config/constants/dropdowns/users/output-language-mode-form.options";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { SettingsNav } from "./components/settings-nav";
import {
  preferencesSchema,
  type PreferencesFormValues,
} from "./validation-schemas/settings.schema";

const SettingsPage: FC = () => {
  const { t } = useTranslation("settings");
  usePageMetadata({ title: t("title") });
  const { data: me, isPending } = useMe();
  const updateMe = useUpdateMe();

  const form = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      full_name: "",
      interface_language: "en",
      preferred_language: "en",
      output_language_mode: "CONVERSATION",
      consent_line: "",
      keep_recordings: true,
    },
  });

  useEffect(() => {
    if (me) {
      form.reset({
        full_name: me.full_name ?? "",
        interface_language: me.interface_language,
        preferred_language: me.preferred_language,
        output_language_mode: me.output_language_mode,
        consent_line: me.consent_line ?? "",
        keep_recordings: me.keep_recordings,
      });
    }
  }, [form, me]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("title")} />
      <SettingsNav />
      {isPending ? (
        <FormSkeleton />
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => updateMe.mutate(values))}
            className="space-y-4"
          >
            <FormSection title={t("profile.title")}>
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("profile.fullName")}</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-1.5">
                <FormLabel>{t("profile.email")}</FormLabel>
                <Input value={me?.email ?? ""} disabled aria-label={t("profile.email")} />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{t("appearance.title")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("appearance.description")}
                  </p>
                </div>
                <ThemeSwitch />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{t("appearance.language")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("appearance.languageDescription")}
                  </p>
                </div>
                <UiLanguageSwitch />
              </div>
            </FormSection>

            <FormSection
              title={t("languages.title")}
              description={t("languages.description")}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="interface_language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("languages.yourLanguage")}</FormLabel>
                      <LanguageSelect value={field.value} onValueChange={field.onChange} ariaLabel={t("languages.yourLanguage")} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferred_language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("languages.templates")}</FormLabel>
                      <LanguageSelect value={field.value} onValueChange={field.onChange} ariaLabel={t("languages.templatesAria")} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormSelectField
                  control={form.control}
                  name="output_language_mode"
                  label={t("languages.output")}
                  options={OutputLanguageModeFormOptions}
                />
              </div>
            </FormSection>

            <FormSection
              title={t("recording.title")}
              description={t("recording.description")}
            >
              <FormField
                control={form.control}
                name="keep_recordings"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div>
                      <FormLabel>{t("recording.keep")}</FormLabel>
                      <FormDescription>
                        {t("recording.keepHint")}
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
              <FormField
                control={form.control}
                name="consent_line"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("recording.consentLine")}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder={me?.default_consent_line}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("recording.consentLineHint")}
                    </FormDescription>
                  </FormItem>
                )}
              />
            </FormSection>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateMe.isPending || !form.formState.isDirty}
                loading={updateMe.isPending}
              >
                {!updateMe.isPending && <Save />} {t("save")}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};

export default SettingsPage;

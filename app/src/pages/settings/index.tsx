import { useEffect, type FC } from "react";
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
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMe, useUpdateMe } from "@/features/user/hooks/use-user";
import { useCatalog } from "@/features/catalog/hooks/use-catalog";
import { OutputLanguageModeFormOptions } from "@/config/constants/dropdowns/users/output-language-mode-form.options";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { SettingsNav } from "./components/settings-nav";
import { preferencesSchema, type PreferencesFormValues } from "./validation-schemas/settings.schema";

const SettingsPage: FC = () => {
  usePageMetadata({ title: "Settings" });
  const { data: me, isPending } = useMe();
  const { data: catalog } = useCatalog();
  const updateMe = useUpdateMe();

  const form = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: { full_name: "", interface_language: "en", output_language_mode: "CONVERSATION", consent_line: "", keep_recordings: true },
  });

  useEffect(() => {
    if (me) {
      form.reset({
        full_name: me.full_name ?? "",
        interface_language: me.interface_language,
        output_language_mode: me.output_language_mode,
        consent_line: me.consent_line ?? "",
        keep_recordings: me.keep_recordings,
      });
    }
  }, [form, me]);

  const languages = (catalog?.languages ?? []).map((language) => ({ id: language.code, label: language.name }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" />
      <SettingsNav />
      {isPending ? (
        <FormSkeleton />
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => updateMe.mutate(values))} className="space-y-4">
            <FormSection title="Profile">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-1.5">
                <FormLabel>Email</FormLabel>
                <Input value={me?.email ?? ""} disabled aria-label="Email" />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Appearance</p>
                  <p className="text-xs text-muted-foreground">Light, dark or follow your system.</p>
                </div>
                <ThemeSwitch />
              </div>
            </FormSection>

            <FormSection title="Languages" description="Calls and practice can happen in many languages.">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormSelectField control={form.control} name="interface_language" label="Your language" options={languages} />
                <FormSelectField control={form.control} name="output_language_mode" label="Suggestions & analysis in" options={OutputLanguageModeFormOptions} />
              </div>
            </FormSection>

            <FormSection title="Recording" description="You are responsible for getting consent where recording laws require it.">
              <FormField
                control={form.control}
                name="keep_recordings"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div>
                      <FormLabel>Keep audio recordings by default</FormLabel>
                      <FormDescription>When off, only transcripts and analyses are stored. You can change it per call.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="consent_line"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default consent disclosure line</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder={me?.default_consent_line} {...field} />
                    </FormControl>
                    <FormDescription>Suggested as the first line of calls when a co-pilot has the consent line enabled.</FormDescription>
                  </FormItem>
                )}
              />
            </FormSection>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateMe.isPending || !form.formState.isDirty} loading={updateMe.isPending}>
                {!updateMe.isPending && <Save />} Save settings
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
};

export default SettingsPage;

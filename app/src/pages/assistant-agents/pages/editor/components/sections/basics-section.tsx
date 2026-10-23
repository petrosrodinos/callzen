import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection } from "@/components/ui/form-section";
import type { Language } from "@/features/catalog/interfaces/catalog.interfaces";
import { MethodologyFormOptions } from "@/config/constants/dropdowns/agents/methodology-form.options";
import type { AssistantAgentFormValues } from "../../../../validation-schemas/assistant-agent.schema";

interface BasicsSectionProps {
  form: UseFormReturn<AssistantAgentFormValues>;
  languages: Language[];
}

export function BasicsSection({ form, languages }: BasicsSectionProps) {
  return (
    <FormSection title="Basics" description="What this co-pilot is for and the outcome it pushes toward.">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Cold Call – Dental Clinics" {...field} />
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
            <FormLabel>Purpose</FormLabel>
            <FormControl>
              <Textarea rows={2} placeholder="Short cold calls to dental clinic owners, focused on booking a demo." {...field} />
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
            <FormLabel>Call goal</FormLabel>
            <FormControl>
              <Input placeholder="Book a 20-minute demo" {...field} />
            </FormControl>
            <FormDescription>The co-pilot keeps steering the conversation toward this outcome.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conversation language</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {languages.map((language) => (
                    <SelectItem key={language.code} value={language.code}>
                      {language.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="methodology"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sales methodology</FormLabel>
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
              <FormLabel>Default co-pilot</FormLabel>
              <FormDescription>Pre-selected when you start a call.</FormDescription>
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

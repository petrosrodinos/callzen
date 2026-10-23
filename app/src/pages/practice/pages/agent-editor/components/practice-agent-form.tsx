import { useState } from "react";
import { useFieldArray, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AudioLines,
  EyeOff,
  Gauge,
  Play,
  Plus,
  Save,
  Target,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSection } from "@/components/ui/form-section";
import { FormSelectField } from "@/components/ui/form-select-field";
import { ScalePicker } from "@/components/ui/scale-picker";
import { LanguageMultiSelect } from "@/components/ui/language-multi-select";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Catalog } from "@/features/catalog/interfaces/catalog.interfaces";
import type { AssistantAgent } from "@/features/assistant-agents/interfaces/assistant-agents.interfaces";
import {
  LeadTemperatureDescriptionOptions,
  LeadTemperatureFormOptions,
} from "@/config/constants/dropdowns/practice/lead-temperature-form.options";
import {
  DifficultyFormOptions,
  ObjectionPersistenceOptions,
  PatienceFormOptions,
} from "@/config/constants/dropdowns/practice/difficulty-form.options";
import { PersonalityFormOptions } from "@/config/constants/dropdowns/practice/personality-form.options";
import { MoodFormOptions } from "@/config/constants/dropdowns/practice/mood-form.options";
import { DecisionAuthorityFormOptions } from "@/config/constants/dropdowns/practice/decision-authority-form.options";
import { BudgetFormOptions } from "@/config/constants/dropdowns/practice/budget-form.options";
import { TimelineFormOptions } from "@/config/constants/dropdowns/practice/timeline-form.options";
import { ScenarioTypeFormOptions } from "@/config/constants/dropdowns/practice/scenario-type-form.options";
import {
  practiceAgentSchema,
  type PracticeAgentFormValues,
} from "../../../validation-schemas/practice-agent.schema";
import { StringListField } from "../../../components/string-list-field";
import { VoicePicker } from "../../../components/voice-picker";

interface PracticeAgentFormProps {
  defaultValues: PracticeAgentFormValues;
  catalog: Catalog;
  assistantAgents: AssistantAgent[];
  isSaving: boolean;
  isNew: boolean;
  onSubmit: (values: PracticeAgentFormValues, startAfter: boolean) => void;
}

const NONE = "__none__";

type FieldName = keyof PracticeAgentFormValues;

// Which form fields live on which tab, used to jump to the tab with a validation error.
const TABS: {
  id: string;
  label: string;
  icon: LucideIcon;
  fields: FieldName[];
}[] = [
  {
    id: "scenario",
    label: "Scenario",
    icon: Target,
    fields: [
      "name",
      "role_prompt",
      "scenario_type",
      "user_objective",
      "scenario_context",
      "selling_product",
      "linked_assistant_agent_id",
    ],
  },
  {
    id: "behaviour",
    label: "Difficulty & personality",
    icon: Gauge,
    fields: [
      "lead_temperature",
      "difficulty",
      "patience",
      "personality",
      "mood",
      "decision_authority",
      "budget",
      "timeline",
      "communication_style",
      "current_solution",
    ],
  },
  {
    id: "hidden",
    label: "Hidden layer",
    icon: EyeOff,
    fields: [
      "pain_points",
      "objections",
      "hidden_information",
      "conversion_conditions",
    ],
  },
  {
    id: "identity",
    label: "Identity & background",
    icon: UserRound,
    fields: [
      "prospect_name",
      "job_title",
      "company",
      "industry",
      "age_range",
      "accent",
      "time_limit_minutes",
      "languages",
      "background_story",
      "briefing",
    ],
  },
  {
    id: "voice",
    label: "Voice",
    icon: AudioLines,
    fields: ["voice_provider", "voice"],
  },
];

export function PracticeAgentForm({
  defaultValues,
  catalog,
  assistantAgents,
  isSaving,
  isNew,
  onSubmit,
}: PracticeAgentFormProps) {
  const form = useForm<PracticeAgentFormValues>({
    resolver: zodResolver(practiceAgentSchema),
    defaultValues,
  });
  const objections = useFieldArray({
    control: form.control,
    name: "objections",
  });
  const [provider, voice, languages] = form.watch([
    "voice_provider",
    "voice",
    "languages",
  ]);
  const language = languages[0] ?? "en";

  const [tab, setTab] = useState<string>(TABS[0].id);

  // Hidden tabs unmount their fields, so surface the first tab that has an error.
  const showFirstTabWithError = (
    errors: FieldErrors<PracticeAgentFormValues>,
  ) => {
    const failing = TABS.find((item) =>
      item.fields.some((name) => name in errors),
    );
    if (failing) setTab(failing.id);
  };

  const submit = (startAfter: boolean) =>
    form.handleSubmit(
      (values) => onSubmit(values, startAfter),
      (errors) => {
        showFirstTabWithError(errors);
        toast({
          title: "Please fix the highlighted fields",
          variant: "error",
          duration: 2500,
        });
      },
    );

  return (
    <Form {...form}>
      <form onSubmit={submit(false)}>
        <Tabs value={tab} onValueChange={setTab}>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max">
              {TABS.map((item) => (
                <TabsTrigger key={item.id} value={item.id} className="gap-1.5">
                  <item.icon className="size-4" /> {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="mt-5">
            <TabsContent value="scenario" className="mt-0 space-y-4">
              <FormSection
                title="Role & scenario"
                description="Who the prospect is and the situation of the call."
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scenario name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Cold Call – Busy Clinic Owner"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role_prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Who is the prospect?</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="The operations manager of a 50-person logistics company who is frustrated with their current software."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormSelectField
                    control={form.control}
                    name="scenario_type"
                    label="Scenario type"
                    options={ScenarioTypeFormOptions}
                  />
                  <FormField
                    control={form.control}
                    name="user_objective"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your objective</FormLabel>
                        <FormControl>
                          <Input placeholder="Book a meeting" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="scenario_context"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Situation</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="A cold call out of the blue during a busy workday."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="selling_product"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What you're selling</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Scheduling software for clinics"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="linked_assistant_agent_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Share product context with</FormLabel>
                        <Select
                          value={field.value || NONE}
                          onValueChange={(value) =>
                            field.onChange(value === NONE ? "" : value)
                          }
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={NONE}>No co-pilot</SelectItem>
                            {assistantAgents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Also pre-selects this co-pilot for practice.
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              </FormSection>
            </TabsContent>

            <TabsContent value="behaviour" className="mt-0 space-y-4">
              <FormSection title="How hard is this prospect?">
                <FormField
                  control={form.control}
                  name="lead_temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead temperature</FormLabel>
                      <div
                        className="grid grid-cols-2 gap-2"
                        role="radiogroup"
                        aria-label="Lead temperature"
                      >
                        {LeadTemperatureFormOptions.map((option) => (
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
                            <span className="block text-xs text-muted-foreground">
                              {LeadTemperatureDescriptionOptions[option.id]}
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
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
                        <ScalePicker
                          ariaLabel="Difficulty"
                          value={field.value}
                          onChange={field.onChange}
                          options={DifficultyFormOptions}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="patience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Patience before hanging up</FormLabel>
                        <ScalePicker
                          ariaLabel="Patience"
                          value={field.value}
                          onChange={field.onChange}
                          options={PatienceFormOptions.map((o) => ({
                            ...o,
                            description: "",
                          }))}
                        />
                      </FormItem>
                    )}
                  />
                </div>
              </FormSection>

              <FormSection title="Personality & situation">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormSelectField
                    control={form.control}
                    name="personality"
                    label="Personality"
                    options={PersonalityFormOptions}
                    allowEmpty
                  />
                  <FormSelectField
                    control={form.control}
                    name="mood"
                    label="Mood"
                    options={MoodFormOptions}
                    allowEmpty
                  />
                  <FormSelectField
                    control={form.control}
                    name="decision_authority"
                    label="Decision authority"
                    options={DecisionAuthorityFormOptions}
                    allowEmpty
                  />
                  <FormSelectField
                    control={form.control}
                    name="budget"
                    label="Budget"
                    options={BudgetFormOptions}
                    allowEmpty
                  />
                  <FormSelectField
                    control={form.control}
                    name="timeline"
                    label="Timeline"
                    options={TimelineFormOptions}
                    allowEmpty
                  />
                  <FormField
                    control={form.control}
                    name="communication_style"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Communication style</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Short answers, casual"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="current_solution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current solution / competitor</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Uses spreadsheets; mostly satisfied"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </FormSection>
            </TabsContent>

            <TabsContent value="hidden" className="mt-0 space-y-4">
              <FormSection
                title="Hidden layer"
                description={
                  <span className="inline-flex items-center gap-1">
                    <EyeOff className="size-3.5" /> Never shown before or during
                    the session. Revealed in the analysis.
                  </span>
                }
              >
                <StringListField
                  control={form.control}
                  name="pain_points"
                  label="Real pain points"
                  description="Revealed only through good discovery questions."
                  placeholder="Loses two jobs a week to double bookings"
                  addLabel="Add pain point"
                />
                <div className="space-y-2">
                  <FormLabel>Objections</FormLabel>
                  <ul className="space-y-2">
                    {objections.fields.map((field, index) => (
                      <li
                        key={field.id}
                        className="flex flex-col gap-2 sm:flex-row sm:items-start"
                      >
                        <FormField
                          control={form.control}
                          name={`objections.${index}.text`}
                          render={({ field: textField }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  placeholder='"We are happy with our current vendor"'
                                  aria-label={`Objection ${index + 1}`}
                                  {...textField}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-2">
                          <FormField
                            control={form.control}
                            name={`objections.${index}.persistence`}
                            render={({ field: persistenceField }) => (
                              <FormItem className="w-full sm:w-48">
                                <Select
                                  value={String(persistenceField.value)}
                                  onValueChange={(value) =>
                                    persistenceField.onChange(Number(value))
                                  }
                                >
                                  <FormControl>
                                    <SelectTrigger aria-label="Persistence">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {ObjectionPersistenceOptions.map(
                                      (option) => (
                                        <SelectItem
                                          key={option.id}
                                          value={String(option.id)}
                                        >
                                          {option.label}
                                        </SelectItem>
                                      ),
                                    )}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => objections.remove(index)}
                            aria-label="Remove objection"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      objections.append({ text: "", persistence: 2 })
                    }
                  >
                    <Plus /> Add objection
                  </Button>
                </div>
                <StringListField
                  control={form.control}
                  name="hidden_information"
                  label="Hidden information"
                  description="Shared only if asked the right question or after trust is built."
                  placeholder="Budget was already approved for Q3"
                  addLabel="Add hidden fact"
                />
                <StringListField
                  control={form.control}
                  name="conversion_conditions"
                  label="Conditions to convert"
                  description="What you must do for the prospect to agree."
                  placeholder="Must quantify ROI before discussing price"
                  addLabel="Add condition"
                />
              </FormSection>
            </TabsContent>

            <TabsContent value="identity" className="mt-0 space-y-4">
              <FormSection
                title="Identity & background"
                description="Details that make the persona consistent and realistic."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(
                    [
                      ["prospect_name", "Prospect name", "Daniel Brooks"],
                      ["job_title", "Job title", "Owner"],
                      ["company", "Company", "Brooks Plumbing"],
                      ["industry", "Industry", "Home services"],
                      ["age_range", "Age range", "45-55"],
                      ["accent", "Accent / regional style", "American"],
                    ] as const
                  ).map(([name, label, placeholder]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input placeholder={placeholder} {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                  <FormField
                    control={form.control}
                    name="time_limit_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time limit (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={60}
                            placeholder="No limit"
                            value={field.value ?? ""}
                            onChange={(event) =>
                              field.onChange(
                                event.target.value
                                  ? Number(event.target.value)
                                  : null,
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="languages"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Languages the prospect speaks</FormLabel>
                      <LanguageMultiSelect
                        ariaLabel="Prospect languages"
                        languages={catalog.languages}
                        value={field.value}
                        onChange={field.onChange}
                        max={catalog.max_conversation_languages ?? 5}
                      />
                      <FormDescription>
                        The prospect starts in the starred language and switches
                        if you switch to another one they speak.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="background_story"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Background story</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Started the business 15 years ago and distrusts salespeople."
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="briefing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pre-call briefing</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="Daniel Brooks, owner of Brooks Plumbing. Lead from a business directory. Never heard of you."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        What a salesperson would realistically know before
                        dialing. Shown before the session.
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </FormSection>
            </TabsContent>

            <TabsContent value="voice" className="mt-0 space-y-4">
              <FormSection
                title="Voice"
                description="Pick the provider and a voice that fits the persona."
              >
                <VoicePicker
                  providers={catalog.voice_providers}
                  provider={provider}
                  voice={voice}
                  language={language}
                  onProviderChange={(value) =>
                    form.setValue("voice_provider", value, {
                      shouldDirty: true,
                    })
                  }
                  onVoiceChange={(value) =>
                    form.setValue("voice", value, { shouldDirty: true })
                  }
                />
              </FormSection>
            </TabsContent>
          </div>
        </Tabs>

        <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t bg-background/95 backdrop-blur sm:-mx-6">
          <div className="pb-safe flex items-center justify-end gap-2 px-4 pt-3 sm:px-6">
            <Button type="submit" variant="outline" disabled={isSaving}>
              <Save /> {isNew ? "Save" : "Save changes"}
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              loading={isSaving}
              onClick={() => void submit(true)()}
            >
              {!isSaving && <Play />} Save & practice
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

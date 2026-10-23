import { useEffect, useState } from "react";
import { Check, Star, Timer, Wallet, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { VoiceProvider, VoiceProviderInfo } from "@/features/catalog/interfaces/catalog.interfaces";
import { VoiceProviders } from "@/features/catalog/interfaces/catalog.interfaces";
import { listBrowserVoices, isSpeechRecognitionSupported } from "@/lib/audio/browser-speech";
import { formatCurrency } from "@/lib/format";

interface VoicePickerProps {
  providers: VoiceProviderInfo[];
  provider: VoiceProvider;
  voice: string;
  language: string;
  onProviderChange: (provider: VoiceProvider) => void;
  onVoiceChange: (voice: string) => void;
}

export function VoicePicker({ providers, provider, voice, language, onProviderChange, onVoiceChange }: VoicePickerProps) {
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const selected = providers.find((p) => p.id === provider);

  useEffect(() => {
    if (provider !== VoiceProviders.BROWSER) return;
    void listBrowserVoices().then((voices) => setBrowserVoices(voices.filter((v) => v.lang.toLowerCase().startsWith(language.toLowerCase()))));
  }, [provider, language]);

  const voiceOptions =
    provider === VoiceProviders.BROWSER
      ? browserVoices.map((v) => ({ id: v.name, label: v.name, hint: v.lang }))
      : (selected?.voices ?? []).map((v) => ({ id: v.id, label: `${v.label} · ${v.gender}`, hint: v.style }));

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Voice provider" className="grid gap-2 sm:grid-cols-2">
        {providers.map((p) => {
          const isSelected = p.id === provider;
          const unsupported = p.id === VoiceProviders.BROWSER && !isSpeechRecognitionSupported();
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={unsupported}
              onClick={() => {
                onProviderChange(p.id);
                onVoiceChange(p.id === VoiceProviders.BROWSER ? "" : (p.voices[0]?.id ?? ""));
              }}
              className={cn("flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50", isSelected && "border-primary bg-primary/5 ring-1 ring-primary")}
            >
              <span className="flex items-center gap-2 font-medium">
                {p.label}
                {p.recommended && (
                  <Badge className="gap-1 bg-primary/10 text-primary shadow-none hover:bg-primary/10">
                    <Star className="size-3" /> Recommended
                  </Badge>
                )}
                {isSelected && <Check className="ml-auto size-4 text-primary" />}
              </span>
              <span className="text-xs text-muted-foreground">{unsupported ? "Not supported in this browser. Use Chrome or Edge." : p.description}</span>
              <span className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Waves className="size-3" /> Realism {"★".repeat(p.realism)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Timer className="size-3" /> {p.latency}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Wallet className="size-3" /> ~{formatCurrency(p.cost_per_minute_usd)}/min
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <Label>Voice</Label>
        <Select value={voice || undefined} onValueChange={onVoiceChange}>
          <SelectTrigger aria-label="Voice">
            <SelectValue placeholder={provider === VoiceProviders.BROWSER ? "Default browser voice" : "Choose a voice"} />
          </SelectTrigger>
          <SelectContent>
            {voiceOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <span>{option.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">{option.hint}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {provider === VoiceProviders.BROWSER && !voiceOptions.length && <p className="text-xs text-muted-foreground">No voices for this language were found; your browser's default voice will be used.</p>}
      </div>
    </div>
  );
}

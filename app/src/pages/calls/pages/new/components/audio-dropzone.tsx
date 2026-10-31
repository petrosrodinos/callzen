import { useRef, useState, type DragEvent, type FC } from "react";
import { useTranslation } from "react-i18next";
import { FileAudio, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioDropzoneProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  error?: string;
}

const ACCEPT = "audio/*,video/mp4,video/webm,.mp3,.m4a,.mp4,.wav,.webm,.ogg,.oga,.aac,.flac,.opus";

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export const AudioDropzone: FC<AudioDropzoneProps> = ({ file, onChange, disabled, error }) => {
  const { t } = useTranslation("calls");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (files: FileList | null) => {
    const next = files?.[0];
    if (next) onChange(next);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) pick(event.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} disabled={disabled} onChange={(event) => pick(event.target.files)} />
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileAudio className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label={t("new.upload.remove")} disabled={disabled} onClick={() => onChange(null)}>
            <X />
          </Button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-disabled={disabled}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(event) => {
            if (!disabled && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn("flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", dragging && "border-primary bg-primary/5", error && "border-destructive", disabled && "cursor-not-allowed opacity-50")}
        >
          <Upload className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">{t("new.upload.dropzone")}</p>
          <p className="text-xs text-muted-foreground">{t("new.upload.formats")}</p>
        </div>
      )}
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
};

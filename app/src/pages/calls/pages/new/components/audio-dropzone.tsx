import { useRef, useState, type DragEvent, type FC } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, FileAudio, Loader2, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UploadItem {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  percent: number;
  error?: string;
}

interface AudioDropzoneProps {
  items: UploadItem[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  max: number;
  disabled?: boolean;
  error?: string;
}

const ACCEPT = "audio/*,video/mp4,video/webm,.mp3,.m4a,.mp4,.wav,.webm,.ogg,.oga,.aac,.flac,.opus";

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export const AudioDropzone: FC<AudioDropzoneProps> = ({ items, onAdd, onRemove, max, disabled, error }) => {
  const { t } = useTranslation("calls");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const hasItems = items.length > 0;
  const full = items.length >= max;

  const pick = (files: FileList | null) => {
    if (files?.length) onAdd(Array.from(files));
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) pick(event.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <input ref={inputRef} type="file" multiple accept={ACCEPT} className="sr-only" tabIndex={-1} disabled={disabled} onChange={(event) => pick(event.target.files)} />

      {hasItems && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className={cn("flex items-center gap-3 rounded-xl border p-3", item.status === "error" && "border-destructive/50")}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileAudio className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className={cn("text-xs", item.status === "error" ? "text-destructive" : "text-muted-foreground")}>
                  {item.status === "error" && item.error ? item.error : formatSize(item.file.size)}
                </p>
              </div>
              {item.status === "uploading" && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" role="status">
                  <Loader2 className="size-3.5 animate-spin" /> {item.percent}%
                </span>
              )}
              {item.status === "done" && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="size-3.5" /> {t("new.upload.uploaded")}
                </span>
              )}
              {item.status !== "uploading" && item.status !== "done" && (
                <Button type="button" variant="ghost" size="icon" aria-label={`${t("new.upload.remove")}: ${item.file.name}`} disabled={disabled} onClick={() => onRemove(item.id)}>
                  <X />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!full && (
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
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed text-center transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            hasItems ? "p-4" : "p-8",
            dragging && "border-primary bg-primary/5",
            error && "border-destructive",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {hasItems ? <Plus className="size-5 text-muted-foreground" /> : <Upload className="size-6 text-muted-foreground" />}
          <p className="text-sm font-medium">{hasItems ? t("new.upload.addMore") : t("new.upload.dropzone")}</p>
          <p className="text-xs text-muted-foreground">{t("new.upload.formats", { max })}</p>
        </div>
      )}

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
};

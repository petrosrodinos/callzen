import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NotebookPen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateCall } from "@/features/calls/hooks/use-calls";

export function NotesCard({
  callId,
  notes,
}: {
  callId: string;
  notes: string | null;
}) {
  const { t } = useTranslation("library");
  const [value, setValue] = useState(notes ?? "");
  const update = useUpdateCall();
  const dirty = value !== (notes ?? "");

  return (
    <Card className="space-y-3 p-5">
      <h3 className="flex items-center gap-2 font-semibold">
        <NotebookPen className="size-4 text-primary" />{" "}
        {t("detail.notes.title")}
      </h3>
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={4}
        placeholder={t("detail.notes.placeholder")}
        aria-label={t("detail.notes.title")}
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={!dirty || update.isPending}
          loading={update.isPending}
          onClick={() =>
            update.mutate({ id: callId, dto: { user_notes: value } })
          }
        >
          {t("detail.notes.save")}
        </Button>
      </div>
    </Card>
  );
}

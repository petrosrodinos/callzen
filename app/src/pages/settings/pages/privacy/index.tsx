import { useState, type FC } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Server, ShieldAlert, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { useCatalog } from "@/features/catalog/hooks/use-catalog";
import { useDeleteMe } from "@/features/user/hooks/use-user";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { SettingsNav } from "../../components/settings-nav";
import {
  deleteAccountSchema,
  type DeleteAccountFormValues,
} from "../../validation-schemas/settings.schema";

const PrivacyPage: FC = () => {
  usePageMetadata({ title: "Privacy & data" });
  const { data: catalog } = useCatalog();
  const deleteMe = useDeleteMe();
  const [open, setOpen] = useState(false);
  const form = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { password: "", confirmation: "" as "DELETE" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" />
      <SettingsNav />
      <div className="space-y-4">
        <Card className="space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Lock className="size-4 text-primary" /> Your data
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              Recordings, transcripts, scripts and agent configurations are
              private to your account.
            </li>
            <li>
              You can delete any recording, transcript or call from its page at
              any time. Deletion is permanent.
            </li>
            <li>
              You can keep only transcripts and analyses by turning off
              recordings in Settings or per call.
            </li>
            <li>
              Sensitive information you provide (scripts, pricing, customer
              details) is only sent to the AI providers below to produce
              suggestions and analyses.
            </li>
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Server className="size-4 text-primary" /> Who processes your data
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Based on the models and voice providers you select.
          </p>
          <ul className="divide-y">
            {(catalog?.data_processors ?? []).map((processor) => (
              <li key={processor.name} className="py-3">
                <p className="text-sm font-medium">{processor.name}</p>
                <p className="text-sm text-muted-foreground">
                  {processor.purpose}
                </p>
                <p className="text-xs text-muted-foreground">
                  Region: {processor.region}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex items-start gap-3 border-amber-500/30 p-5">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <h2 className="font-semibold">Recording consent</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Recording laws differ by country and region, and some require
              every participant's consent. Before recording a call, make sure
              you have it. Co-pilots can suggest your consent line as the first
              line of every call.
            </p>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 border-destructive/40 p-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h2 className="font-semibold text-destructive">Delete account</h2>
            <p className="text-sm text-muted-foreground">
              Permanently deletes your account, co-pilots, prospects, calls,
              recordings and analyses.
            </p>
          </div>
          <Button variant="destructive" onClick={() => setOpen(true)}>
            <Trash2 /> Delete account
          </Button>
        </Card>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => !deleteMe.isPending && setOpen(next)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete your account permanently?</DialogTitle>
            <DialogDescription>
              All your data is removed immediately and can't be recovered.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                deleteMe.mutate(values.password),
              )}
              className="space-y-3"
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type DELETE to confirm</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={deleteMe.isPending}
                  loading={deleteMe.isPending}
                >
                  Delete everything
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrivacyPage;

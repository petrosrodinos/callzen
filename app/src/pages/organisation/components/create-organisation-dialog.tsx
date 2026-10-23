import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateOrganisation } from "@/features/organisations/hooks/use-organisations";
import { organisationNameSchema, type OrganisationNameFormValues } from "../validation-schemas/organisation.schema";

interface CreateOrganisationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateOrganisationDialog({ open, onOpenChange, onCreated }: CreateOrganisationDialogProps) {
  const create = useCreateOrganisation();
  const form = useForm<OrganisationNameFormValues>({ resolver: zodResolver(organisationNameSchema), defaultValues: { name: "" } });

  const onSubmit = (values: OrganisationNameFormValues) =>
    create.mutate(values.name, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
        onCreated?.();
      },
    });

  return (
    <Dialog open={open} onOpenChange={(next) => !create.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create an organisation</DialogTitle>
          <DialogDescription>Each organisation has its own co-pilots, prospects, calls and members. You'll be its owner and can invite your team.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organisation name</FormLabel>
                  <FormControl>
                    <Input autoFocus placeholder="Acme Sales Team" {...field} />
                  </FormControl>
                  <FormDescription>Your teammates will see this name in their invitation.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={create.isPending} loading={create.isPending}>
                {!create.isPending && <Building2 />} Create organisation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

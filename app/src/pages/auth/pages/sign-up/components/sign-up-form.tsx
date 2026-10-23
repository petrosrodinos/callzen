import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { SignUpSchema, type SignUpFormValues } from "../../../validation-schemas/auth";
import { useSignup } from "@/features/auth/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function SignUpForm() {
  const { mutate, isPending } = useSignup();

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      full_name: "",
      email: new URLSearchParams(window.location.search).get("email") ?? "",
      password: "",
      confirm_password: "",
    },
  });

  function onSubmit(data: SignUpFormValues) {
    mutate({ email: data.email, password: data.password, full_name: data.full_name });
  }

  return (
    <div className="grid gap-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Maria Papadopoulou" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input placeholder="********" {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="mt-2 w-full" disabled={isPending} loading={isPending}>
              Create account
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

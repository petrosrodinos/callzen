import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SignInSchema, type SignInFormValues } from "../../../validation-schemas/auth";
import { useSignin } from "@/features/auth/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface UserAuthFormProps {
  className?: string;
  props?: any;
}

export function SignInForm({ className, ...props }: UserAuthFormProps) {
  const { mutate, isPending } = useSignin();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: new URLSearchParams(window.location.search).get("email") ?? "",
      password: "",
    },
  });

  function onSubmit(data: SignInFormValues) {
    mutate({ email: data.email, password: data.password });
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-2">
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
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                  </div>
                  <FormControl>
                    <Input placeholder="••••••••" {...field} type="password" autoComplete="current-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="mt-2 w-full" disabled={isPending} loading={isPending}>
              Sign in
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

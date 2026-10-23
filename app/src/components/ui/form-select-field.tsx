import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NONE = "__none__";

interface FormSelectFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: { id: string | number; label: string }[];
  placeholder?: string;
  description?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  numeric?: boolean;
  className?: string;
}

export function FormSelectField<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder = "Select",
  description,
  allowEmpty = false,
  emptyLabel = "Not specified",
  numeric = false,
  className,
}: FormSelectFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <Select
            value={field.value === "" || field.value === null || field.value === undefined ? (allowEmpty ? NONE : undefined) : String(field.value)}
            onValueChange={(value) => field.onChange(value === NONE ? (numeric ? null : "") : numeric ? Number(value) : value)}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {allowEmpty && <SelectItem value={NONE}>{emptyLabel}</SelectItem>}
              {options.map((option) => (
                <SelectItem key={option.id} value={String(option.id)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

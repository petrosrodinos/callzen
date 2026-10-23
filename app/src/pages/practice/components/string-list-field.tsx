import { useFieldArray, type Control, type FieldArrayPath, type FieldPath, type FieldValues } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface StringListFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldArrayPath<T>;
  label: string;
  description?: string;
  placeholder: string;
  addLabel: string;
}

// Editable list of { value } items (pain points, hidden info, conversion conditions).
export function StringListField<T extends FieldValues>({ control, name, label, description, placeholder, addLabel }: StringListFieldProps<T>) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="space-y-2">
      <div>
        <FormLabel>{label}</FormLabel>
        {description && <FormDescription>{description}</FormDescription>}
      </div>
      <ul className="space-y-2">
        {fields.map((field, index) => (
          <li key={field.id} className="flex items-start gap-2">
            <FormField
              control={control}
              name={`${name}.${index}.value` as FieldPath<T>}
              render={({ field: inputField }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder={placeholder} aria-label={`${label} ${index + 1}`} {...inputField} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Remove">
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" size="sm" onClick={() => append({ value: "" } as never)}>
        <Plus /> {addLabel}
      </Button>
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useActiveOrganisation, useMembers } from "@/features/organisations/hooks/use-organisations";
import { OrgRoles } from "@/features/organisations/interfaces/organisations.interfaces";

interface MemberPickerProps {
    value: string[];
    onChange: (userIds: string[]) => void;
    disabled?: boolean;
}

// Searchable multi-select of the active organisation's members. Owners are left out: they already see everything.
export function MemberPicker({ value, onChange, disabled }: MemberPickerProps) {
    const { t } = useTranslation("access");
    const [open, setOpen] = useState(false);
    const { organisation } = useActiveOrganisation();
    const { data: members, isPending } = useMembers(organisation?.id);
    const options = (members ?? []).filter((member) => member.role !== OrgRoles.OWNER);
    const selected = new Set(value);
    const nameOf = (userId: string) => {
        const member = members?.find((item) => item.user_id === userId);
        return member ? member.full_name || member.email : t("picker.formerMember");
    };
    const toggle = (userId: string) => onChange(selected.has(userId) ? value.filter((id) => id !== userId) : [...value, userId]);

    if (isPending) return <Skeleton className="h-9 w-full rounded-md" />;

    return (
        <div className="space-y-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="w-full justify-between font-normal">
                        {value.length ? t("picker.selected", { count: value.length }) : t("picker.placeholder")}
                        <ChevronsUpDown className="opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                        <CommandInput placeholder={t("picker.search")} />
                        <CommandList>
                            <CommandEmpty>{t("picker.noMembers")}</CommandEmpty>
                            <CommandGroup>
                                {options.map((member) => (
                                    <CommandItem key={member.user_id} value={`${member.full_name ?? ""} ${member.email}`} onSelect={() => toggle(member.user_id)}>
                                        <Check className={cn("size-4", selected.has(member.user_id) ? "opacity-100" : "opacity-0")} />
                                        <span className="truncate">{member.full_name || member.email}</span>
                                        {member.full_name && <span className="ml-auto truncate text-xs text-muted-foreground">{member.email}</span>}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {!!value.length && (
                <div className="flex flex-wrap gap-1.5">
                    {value.map((userId) => (
                        <Badge key={userId} variant="secondary" className="gap-1 pr-1">
                            {nameOf(userId)}
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => toggle(userId)}
                                    className="rounded-sm opacity-60 hover:opacity-100"
                                    aria-label={t("picker.remove", { name: nameOf(userId) })}
                                >
                                    <X className="size-3" />
                                </button>
                            )}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}

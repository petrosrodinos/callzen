import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMinutes } from "@/lib/format";
import type { MemberMinutes } from "@/features/billing/interfaces/billing.interfaces";

const withCap = (used: number, cap: number | null) => (cap == null ? formatMinutes(used) : `${formatMinutes(used)} / ${formatMinutes(cap)}`);

// Organisations with usage.view: live and practice plan minutes per member this period (§6.1). Bought personal
// minutes are never shown here.
export function MemberMinutesTable({ members }: { members: MemberMinutes[] }) {
    const { t } = useTranslation("settings");
    return (
        <Card className="gap-0 p-5">
            <h2 className="mb-3 font-semibold">{t("usage.members.title")}</h2>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("usage.members.member")}</TableHead>
                            <TableHead className="text-right">{t("usage.members.live")}</TableHead>
                            <TableHead className="text-right">{t("usage.members.practice")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {members.map((member) => (
                            <TableRow key={member.user_id}>
                                <TableCell className="font-medium">
                                    {member.name}
                                    {member.is_owner && (
                                        <Badge variant="outline" className="ml-2 text-[10px]">
                                            {t("usage.members.owner")}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">{withCap(member.live_minutes, member.live_cap_minutes)}</TableCell>
                                <TableCell className="text-right tabular-nums">{withCap(member.practice_minutes, member.practice_cap_minutes)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}

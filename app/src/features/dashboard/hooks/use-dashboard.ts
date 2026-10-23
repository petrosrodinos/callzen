import { useQuery } from "@tanstack/react-query";
import { getDashboardOverview } from "../services/dashboard.services";

export const useDashboardOverview = (days: number, scope: "me" | "team" = "me") => {
    return useQuery({
        queryKey: ["dashboard", days, scope],
        queryFn: () => getDashboardOverview(days, scope),
    });
};

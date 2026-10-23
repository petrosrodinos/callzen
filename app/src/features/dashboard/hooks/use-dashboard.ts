import { useQuery } from "@tanstack/react-query";
import { getDashboardOverview } from "../services/dashboard.services";

export const useDashboardOverview = (days: number) => {
    return useQuery({
        queryKey: ["dashboard", days],
        queryFn: () => getDashboardOverview(days),
    });
};

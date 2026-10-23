import { useQuery } from "@tanstack/react-query";
import { getCatalog } from "../services/catalog.services";

export const useCatalog = () => {
    return useQuery({
        queryKey: ["catalog"],
        queryFn: getCatalog,
        staleTime: 1000 * 60 * 30,
    });
};

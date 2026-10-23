import { useEffect } from "react";
import { environments } from "@/config/environments";

interface UsePageMetadataOptions {
    title?: string;
    iconUrl?: string;
}

export const usePageMetadata = ({ title, iconUrl }: UsePageMetadataOptions) => {
    useEffect(() => {
        if (title) {
            document.title = `${title} · ${environments.APP_NAME}`;
        }
        return () => {
            if (title) {
                document.title = environments.APP_NAME;
            }
        };
    }, [title]);

    useEffect(() => {
        if (iconUrl) {
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
                link = document.createElement("link");
                link.rel = "icon";
                document.getElementsByTagName("head")[0].appendChild(link);
            }
            link.href = iconUrl;
        }
    }, [iconUrl]);
};


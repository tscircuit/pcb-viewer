import { useEffect } from "react";
import { useGlobalStore } from "global-store";

export const useHotKey = (key: string, onUse: () => void) => {
    const isMouseOverContainer = useGlobalStore((s) => s.is_mouse_over_container) as boolean

    useEffect(() => {
        if (!key || typeof onUse !== 'function') return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const keyParts = key.split("+");

            const ctrlRequired = keyParts.includes("ctrl");
            const shiftRequired = keyParts.includes("shift");
            const altRequired = keyParts.includes("alt");
            const metaRequired = keyParts.includes("meta");
            const mainKey = keyParts[keyParts.length - 1];

            if (
                isMouseOverContainer && (!ctrlRequired || event.ctrlKey) &&
                (!shiftRequired || event.shiftKey) &&
                (!altRequired || event.altKey) &&
                (!metaRequired || event.metaKey) &&
                event.key.toLowerCase() === mainKey.toLowerCase()
            ) {
                event.preventDefault();
                onUse();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [key, onUse]);
};
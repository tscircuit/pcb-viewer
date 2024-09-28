import { useEffect } from "react"

export const useHotKey = (key: string, onUse: Function) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const keyParts = key.split("+");

            const ctrlRequired = keyParts.includes("ctrl");
            const shiftRequired = keyParts.includes("shift");
            const mainKey = keyParts[keyParts.length - 1];

            if (
                (!ctrlRequired || (ctrlRequired && event.ctrlKey)) &&
                (!shiftRequired || (shiftRequired && event.shiftKey)) &&
                event.key.toLowerCase() === mainKey.toLowerCase()
            ) {
                onUse();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [key]);
};
import { useEffect, useRef } from "react";

import { connectSocket } from "./socket.js";

/**
 * Подключается к WebSocket при монтировании.
 * Не отключается при размонтировании — сокет общий.
 */
export function useSocket(): void
{
    const connectedRef = useRef(false);

    useEffect(() =>
    {
        const token = localStorage.getItem("token");

        if (!token)
        {
            return;
        }

        if (!connectedRef.current)
        {
            connectSocket(token);
            connectedRef.current = true;
        }
    }, []);
}
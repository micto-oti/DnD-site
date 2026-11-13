import { io, type Socket } from "socket.io-client";

import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from "@gm-table/shared";

const WS_URL = import.meta.env.VITE_WS_URL;

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: ClientSocket | null = null;

/**
 * Подключается к WebSocket-серверу с JWT.
 * Если сокет уже существует — возвращает его.
 */
export function connectSocket(token: string): ClientSocket
{
    if (socket?.connected)
    {
        return socket;
    }

    if (socket)
    {
        socket.disconnect();
    }

    socket = io(WS_URL, {
        auth: { token },
        transports: ["websocket"],
    }) as ClientSocket;

    return socket;
}

/**
 * Возвращает текущий сокет. Бросает ошибку, если не подключён.
 */
export function getSocket(): ClientSocket
{
    if (!socket)
    {
        throw new Error("Socket is not connected. Call connectSocket first.");
    }

    return socket;
}

/**
 * Отключает сокет.
 */
export function disconnectSocket(): void
{
    if (socket)
    {
        socket.disconnect();
        socket = null;
    }
}
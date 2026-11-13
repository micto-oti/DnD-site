import type {
    ServerToClientEvents,
} from "@gm-table/shared";

import { getSocket } from "./socket.js";

type Handler<K extends keyof ServerToClientEvents> = ServerToClientEvents[K];

/**
 * Подписаться на событие. Возвращает функцию отписки.
 */
export function on<K extends keyof ServerToClientEvents>(
    event: K,
    handler: Handler<K>,
): () => void
{
    const socket = getSocket();

    socket.on(event, handler as never);

    return () => socket.off(event, handler as never);
}
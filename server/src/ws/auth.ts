import type { ExtendedError, Socket } from "socket.io";

import { verifyTokenStandalone } from "@/auth/jwt.js";

/**
 * Middleware для Socket.IO.
 * Проверяет JWT из handshake.auth.token.
 * Кладёт userId и email в socket.data.
 */
export async function authenticateSocket(
    socket: Socket,
    next: (err?: ExtendedError) => void,
): Promise<void>
{
    try
    {
        const token = socket.handshake.auth.token as string | undefined;

        if (!token)
        {
            next(new Error("UNAUTHORIZED: no token"));
            return;
        }

        const payload = verifyTokenStandalone(token);

        socket.data.userId = payload.sub;
        socket.data.email = payload.email;

        next();
    }
    catch
    {
        next(new Error("UNAUTHORIZED: invalid token"));
    }
}
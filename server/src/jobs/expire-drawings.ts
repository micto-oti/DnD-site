import { TIMINGS } from "@gm-table/shared";
import type { FastifyBaseLogger } from "fastify";

import { expireDrawings, getAllRoomIds } from "@/services/drawing.service.js";
import type { SocketServer } from "@/ws/index.js";

/**
 * Запускает cron для удаления истёкших рисунков.
 */
export function startDrawingsCron(
    io: SocketServer,
    log: FastifyBaseLogger,
): NodeJS.Timeout
{
    const interval = setInterval(() =>
    {
        try
        {
            const roomIds = getAllRoomIds();

            for (const roomId of roomIds)
            {
                const expiredIds = expireDrawings(roomId);

                for (const id of expiredIds)
                {
                    io.to(`room:${roomId}`).emit("drawing:expired", {
                        drawingId: id,
                    });
                }
            }
        }
        catch (err)
        {
            log.error(`Drawings cron error: ${String(err)}`);
        }
    }, TIMINGS.EXPIRATION_CHECK_INTERVAL_MS);

    log.info("Drawings cron started");

    return interval;
}
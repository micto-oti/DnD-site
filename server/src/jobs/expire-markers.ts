import { TIMINGS } from "@gm-table/shared";
import type { FastifyBaseLogger } from "fastify";

import { expireMarkers, getAllRoomIds } from "@/services/marker.service.js";
import type { SocketServer } from "@/ws/index.js";

/**
 * Запускает cron для удаления истёкших меток.
 */
export function startMarkersCron(
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
                const expiredIds = expireMarkers(roomId);

                for (const id of expiredIds)
                {
                    io.to(`room:${roomId}`).emit("marker:expired", {
                        markerId: id,
                    });
                }
            }
        }
        catch (err)
        {
            log.error(`Markers cron error: ${String(err)}`);
        }
    }, TIMINGS.EXPIRATION_CHECK_INTERVAL_MS);

    log.info("Markers cron started");

    return interval;
}
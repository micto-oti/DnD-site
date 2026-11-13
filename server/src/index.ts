import path from "node:path";

import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";

import { registerAssetRoutes } from "@/api/asset.routes.js";
import { registerAuthRoutes } from "@/api/auth.routes.js";
import { registerRoomRoutes } from "@/api/room.routes.js";
import { registerSceneRoutes } from "@/api/scene.routes.js";
import { registerTokenNoteRoutes } from "@/api/token-note.routes.js";
import { registerTokenRoutes } from "@/api/token.routes.js";
import { registerUploadRoutes } from "@/api/upload.routes.js";
import { registerUserRoutes } from "@/api/users.routes.js";
import { registerJwt } from "@/auth/jwt.js";
import { corsOrigins, env } from "@/config/env.js";
import { prisma } from "@/db/prisma.js";
import { startDrawingsCron } from "@/jobs/expire-drawings.js";
import { startMarkersCron } from "@/jobs/expire-markers.js";
import { registerWebSocket } from "@/ws/index.js";

const start = async (): Promise<void> => {
    // При старте сервера — сбрасываем онлайн-статусы
    await prisma.roomMember.updateMany({
        data: { isOnline: false },
    });

    await prisma.token.updateMany({
        where: { ownerId: { not: null } },
        data: { isOnline: false },
    });

    const app = Fastify({
        logger: {
            level: env.LOG_LEVEL,
        },
    });

    await app.register(cors, {
        origin: corsOrigins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });

    await app.register(multipart, {
        limits: {
            fileSize: env.UPLOAD_MAX_SIZE_MB * 1024 * 1024,
        },
    });

    await app.register(fastifyStatic, {
        root: path.resolve(process.cwd(), env.UPLOAD_DIR),
        prefix: "/uploads/",
        decorateReply: false,
    });

    await registerJwt(app);

    app.get("/health", async () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
    }));

    await registerAuthRoutes(app);
    await registerRoomRoutes(app);
    await registerSceneRoutes(app);
    await registerTokenRoutes(app);
    await registerTokenNoteRoutes(app);
    await registerAssetRoutes(app);
    await registerUploadRoutes(app);
    await registerUserRoutes(app);

    const io = await registerWebSocket(app);

    const drawingsCron = startDrawingsCron(io, app.log);
    const markersCron = startMarkersCron(io, app.log);

    const shutdown = async (signal: string): Promise<void> => {
        app.log.info(`Received ${signal}, shutting down...`);

        clearInterval(drawingsCron);
        clearInterval(markersCron);

        await io.close();
        await app.close();
        await prisma.$disconnect();
        process.exit(0);
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));

    try {
        await app.listen({ port: env.SERVER_PORT, host: env.SERVER_HOST });
        app.log.info(`Server listening on http://${env.SERVER_HOST}:${env.SERVER_PORT}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

void start();

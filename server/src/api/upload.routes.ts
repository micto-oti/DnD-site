import type { FastifyInstance } from "fastify";

import { requireAuth } from "@/auth/middleware.js";
import { saveUploadedFile, UploadError } from "@/services/upload.service.js";

export async function registerUploadRoutes(app: FastifyInstance): Promise<void>
{
    app.post(
        "/api/upload",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const data = await request.file();

            if (!data)
            {
                return reply.code(400).send({
                    error: "NO_FILE",
                    message: "Файл не передан",
                });
            }

            try
            {
                const buffer = await data.toBuffer();
                const result = await saveUploadedFile(buffer, data.mimetype);

                return reply.send(result);
            }
            catch (err)
            {
                if (err instanceof UploadError)
                {
                    return reply.code(400).send({
                        error: err.code,
                        message: err.message,
                    });
                }

                throw err;
            }
        },
    );
}
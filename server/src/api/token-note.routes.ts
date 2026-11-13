import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { LIMITS } from "@gm-table/shared";

import { requireAuth } from "@/auth/middleware.js";
import {
    createTokenNote,
    deleteTokenNote,
    listTokenNotes,
    TokenNoteError,
    updateTokenNote,
} from "@/services/token-note.service.js";

const idParamsSchema = z
    .object({
        id: z.string().uuid(),
    })
    .strict();

const tokenIdParamsSchema = z
    .object({
        tokenId: z.string().uuid(),
    })
    .strict();

const createNoteSchema = z
    .object({
        title: z
            .string()
            .trim()
            .min(LIMITS.TOKEN_NOTE_TITLE_MIN_LENGTH)
            .max(LIMITS.TOKEN_NOTE_TITLE_MAX_LENGTH),
        content: z.string().max(LIMITS.TOKEN_NOTE_CONTENT_MAX_LENGTH),
    })
    .strict();

const updateNoteSchema = z
    .object({
        title: z
            .string()
            .trim()
            .min(LIMITS.TOKEN_NOTE_TITLE_MIN_LENGTH)
            .max(LIMITS.TOKEN_NOTE_TITLE_MAX_LENGTH)
            .optional(),
        content: z.string().max(LIMITS.TOKEN_NOTE_CONTENT_MAX_LENGTH).optional(),
    })
    .strict()
    .refine((input) => input.title !== undefined || input.content !== undefined, {
        message: "Нужно передать хотя бы одно поле",
    });

export async function registerTokenNoteRoutes(app: FastifyInstance): Promise<void> {
    app.get<{ Params: { tokenId: string } }>(
        "/api/tokens/:tokenId/notes",
        { preHandler: [requireAuth] },
        async (request, reply) => {
            const params = tokenIdParamsSchema.safeParse(request.params);

            if (!params.success) {
                return reply.code(400).send({
                    error: "INVALID_PARAMS",
                    message: params.error.message,
                });
            }

            try {
                const notes = await listTokenNotes(params.data.tokenId, request.user.sub);

                return reply.send(notes);
            } catch (err) {
                if (err instanceof TokenNoteError) {
                    return reply.code(err.statusCode).send({
                        error: err.code,
                        message: err.message,
                    });
                }

                throw err;
            }
        },
    );

    app.post<{ Params: { tokenId: string } }>(
        "/api/tokens/:tokenId/notes",
        { preHandler: [requireAuth] },
        async (request, reply) => {
            const params = tokenIdParamsSchema.safeParse(request.params);
            const body = createNoteSchema.safeParse(request.body);

            if (!params.success) {
                return reply.code(400).send({
                    error: "INVALID_PARAMS",
                    message: params.error.message,
                });
            }

            if (!body.success) {
                return reply.code(400).send({
                    error: "INVALID_BODY",
                    message: body.error.message,
                });
            }

            try {
                const note = await createTokenNote(
                    params.data.tokenId,
                    request.user.sub,
                    body.data,
                );

                return reply.code(201).send(note);
            } catch (err) {
                if (err instanceof TokenNoteError) {
                    return reply.code(err.statusCode).send({
                        error: err.code,
                        message: err.message,
                    });
                }

                throw err;
            }
        },
    );

    app.patch<{ Params: { id: string } }>(
        "/api/token-notes/:id",
        { preHandler: [requireAuth] },
        async (request, reply) => {
            const params = idParamsSchema.safeParse(request.params);
            const body = updateNoteSchema.safeParse(request.body);

            if (!params.success) {
                return reply.code(400).send({
                    error: "INVALID_PARAMS",
                    message: params.error.message,
                });
            }

            if (!body.success) {
                return reply.code(400).send({
                    error: "INVALID_BODY",
                    message: body.error.message,
                });
            }

            try {
                const note = await updateTokenNote(params.data.id, request.user.sub, body.data);

                return reply.send(note);
            } catch (err) {
                if (err instanceof TokenNoteError) {
                    return reply.code(err.statusCode).send({
                        error: err.code,
                        message: err.message,
                    });
                }

                throw err;
            }
        },
    );

    app.delete<{ Params: { id: string } }>(
        "/api/token-notes/:id",
        { preHandler: [requireAuth] },
        async (request, reply) => {
            const params = idParamsSchema.safeParse(request.params);

            if (!params.success) {
                return reply.code(400).send({
                    error: "INVALID_PARAMS",
                    message: params.error.message,
                });
            }

            try {
                await deleteTokenNote(params.data.id, request.user.sub);

                return reply.send({ ok: true });
            } catch (err) {
                if (err instanceof TokenNoteError) {
                    return reply.code(err.statusCode).send({
                        error: err.code,
                        message: err.message,
                    });
                }

                throw err;
            }
        },
    );
}

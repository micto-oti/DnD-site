import {
    LIMITS,
    type CreateTokenNoteInput,
    type TokenNote,
    type UpdateTokenNoteInput,
} from "@gm-table/shared";

import { prisma } from "@/db/prisma.js";

interface NoteTarget {
    roomId: string;
    ownerId: string | null;
}

export class TokenNoteError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number,
    ) {
        super(message);
        this.name = "TokenNoteError";
    }
}

async function ensureTargetAccess(userId: string, target: NoteTarget): Promise<void> {
    const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId: target.roomId, userId } },
        select: { userId: true },
    });

    if (!member) {
        throw new TokenNoteError("NOT_A_MEMBER", "Вы не участник комнаты", 403);
    }

    if (target.ownerId === null || target.ownerId === userId) {
        throw new TokenNoteError(
            "INVALID_NOTE_TARGET",
            "Заметки доступны только для персонажей других игроков",
            403,
        );
    }
}

async function getTarget(tokenId: string, userId: string): Promise<NoteTarget> {
    const token = await prisma.token.findUnique({
        where: { id: tokenId },
        select: { roomId: true, ownerId: true },
    });

    if (!token) {
        throw new TokenNoteError("TOKEN_NOT_FOUND", "Токен не найден", 404);
    }

    await ensureTargetAccess(userId, token);

    return token;
}

export async function listTokenNotes(tokenId: string, userId: string): Promise<TokenNote[]> {
    await getTarget(tokenId, userId);

    const notes = await prisma.tokenNote.findMany({
        where: { tokenId, authorId: userId },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });

    return notes.map(toTokenNoteDto);
}

export async function createTokenNote(
    tokenId: string,
    userId: string,
    input: CreateTokenNoteInput,
): Promise<TokenNote> {
    await getTarget(tokenId, userId);

    const noteCount = await prisma.tokenNote.count({
        where: { tokenId, authorId: userId },
    });

    if (noteCount >= LIMITS.TOKEN_NOTE_MAX_PER_TOKEN) {
        throw new TokenNoteError(
            "NOTE_LIMIT_REACHED",
            `Для одного персонажа можно создать не более ${LIMITS.TOKEN_NOTE_MAX_PER_TOKEN} заметок`,
            409,
        );
    }

    const note = await prisma.tokenNote.create({
        data: {
            tokenId,
            authorId: userId,
            title: input.title,
            content: input.content,
        },
    });

    return toTokenNoteDto(note);
}

export async function updateTokenNote(
    noteId: string,
    userId: string,
    input: UpdateTokenNoteInput,
): Promise<TokenNote> {
    const note = await prisma.tokenNote.findFirst({
        where: { id: noteId, authorId: userId },
        include: {
            token: {
                select: { roomId: true, ownerId: true },
            },
        },
    });

    if (!note) {
        throw new TokenNoteError("NOTE_NOT_FOUND", "Заметка не найдена", 404);
    }

    await ensureTargetAccess(userId, note.token);

    const updated = await prisma.tokenNote.update({
        where: { id: note.id },
        data: input,
    });

    return toTokenNoteDto(updated);
}

export async function deleteTokenNote(noteId: string, userId: string): Promise<void> {
    const note = await prisma.tokenNote.findFirst({
        where: { id: noteId, authorId: userId },
        include: {
            token: {
                select: { roomId: true, ownerId: true },
            },
        },
    });

    if (!note) {
        throw new TokenNoteError("NOTE_NOT_FOUND", "Заметка не найдена", 404);
    }

    await ensureTargetAccess(userId, note.token);
    await prisma.tokenNote.delete({ where: { id: note.id } });
}

function toTokenNoteDto(note: {
    id: string;
    tokenId: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}): TokenNote {
    return {
        id: note.id,
        tokenId: note.tokenId,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
    };
}

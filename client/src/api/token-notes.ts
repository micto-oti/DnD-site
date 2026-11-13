import type { CreateTokenNoteInput, TokenNote, UpdateTokenNoteInput } from "@gm-table/shared";

import { apiFetch } from "./client.js";

export async function getTokenNotes(tokenId: string): Promise<TokenNote[]> {
    return await apiFetch<TokenNote[]>(`/api/tokens/${tokenId}/notes`);
}

export async function createTokenNote(
    tokenId: string,
    input: CreateTokenNoteInput,
): Promise<TokenNote> {
    return await apiFetch<TokenNote>(`/api/tokens/${tokenId}/notes`, {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export async function updateTokenNote(
    noteId: string,
    input: UpdateTokenNoteInput,
): Promise<TokenNote> {
    return await apiFetch<TokenNote>(`/api/token-notes/${noteId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
    });
}

export async function deleteTokenNote(noteId: string): Promise<void> {
    await apiFetch<{ ok: boolean }>(`/api/token-notes/${noteId}`, {
        method: "DELETE",
    });
}

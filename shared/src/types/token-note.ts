/**
 * Приватная Markdown-заметка пользователя о чужом токене-персонаже.
 */
export interface TokenNote {
    id: string;
    tokenId: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTokenNoteInput {
    title: string;
    content: string;
}

export interface UpdateTokenNoteInput {
    title?: string;
    content?: string;
}

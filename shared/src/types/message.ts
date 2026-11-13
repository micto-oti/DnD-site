import type { RollData } from "./roll.js";

/**
 * Режим сообщения в чате.
 * Пока только "common" — общий чат комнаты.
 */
export type MessageMode = "common";

/**
 * Сообщение в чате.
 * Соответствует записи в таблице `messages`.
 */
export interface Message
{
    id: string;
    roomId: string;
    userId: string | null;          // null, если пользователь удалён
    nickname: string;               // денормализация для UI
    mode: MessageMode;
    content: string;
    isRoll: boolean;
    rollData: RollData | null;
    createdAt: string;
}

/**
 * Входные данные для отправки сообщения.
 *
 * Если `content` начинается с `/roll ` или `/r ` —
 * сервер распарсит как бросок кубиков.
 */
export interface SendMessageInput
{
    content: string;
    mode?: MessageMode;
}
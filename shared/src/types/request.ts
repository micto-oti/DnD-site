import type { TurnState } from "./room.js";

/**
 * Статус заявки игрока.
 *
 * - `pending` — висит, ждёт реакции ГМа
 * - `accepted` — ГМ принял, игрок вернулся в active
 * - `rejected` — ГМ отклонил, игрок остался confirmed
 * - `expired` — заявка снята автоматически (таймер, смена сцены, завершение хода)
 */
export type RequestStatus = "pending" | "accepted" | "rejected" | "expired";

/**
 * Заявка игрока на возврат в active.
 * Соответствует записи в таблице `action_requests`.
 *
 * Заявка — это просто сигнал ГМу: «я хочу ещё подействовать».
 * Никакого текста внутри нет. ГМ либо реагирует (принять/отклонить),
 * либо игнорирует — тогда заявка снимается через 30 секунд.
 */
export interface ActionRequest
{
    id: string;
    roomId: string;
    userId: string;
    status: RequestStatus;
    createdAt: string;
    expiresAt: string;              // ISO-строка; now() + 30 секунд при создании
    resolvedAt: string | null;      // когда ГМ отреагировал или когда истекла
}

/**
 * Входные данные для создания заявки.
 * Только roomId — userId берётся из JWT на сервере.
 */
export interface CreateActionRequestInput
{
    // пусто — всё определяется контекстом запроса
}

/**
 * Входные данные для реакции ГМа на заявку.
 */
export interface ResolveActionRequestInput
{
    status: "accepted" | "rejected";
}

/**
 * Агрегатное состояние хода в комнате.
 * Отдаётся клиенту вместе с участниками — чтобы UI знал,
 * кто подтвердил, у кого заявка и т.д.
 */
export interface TurnStatus
{
    turnState: TurnState;
    confirmedUserIds: string[];     // кто подтвердил действие в текущем ходу
    pendingRequestUserIds: string[];// у кого висит заявка
}
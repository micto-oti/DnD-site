/**
 * Роль участника в комнате.
 */
export type Role = "gm" | "player";

/**
 * Состояние хода в комнате.
 * - `active` — игроки действуют.
 * - `gm_control` — все подтвердили, ГМ контролирует поле.
 */
export type TurnState = "active" | "gm_control";

/**
 * Комната (игровая сессия).
 * Соответствует записи в таблице `rooms`.
 */
export interface Room
{
    id: string;
    shortId: string;
    name: string;
    gmId: string;
    createdAt: string;
}

/**
 * Участник комнаты.
 * Соответствует записи в таблице `room_members`.
 */
export interface RoomMember
{
    roomId: string;
    userId: string;
    role: Role;
    actionConfirmed: boolean;
    isOnline: boolean;
    joinedAt: string;
}

/**
 * Участник с информацией о пользователе.
 * Используется в UI — списки, доп. панель.
 */
export interface RoomMemberWithUser extends RoomMember
{
    user: {
        id: string;
        nickname: string;
        email: string;
    };
}

/**
 * Полное состояние комнаты.
 * Возвращается при подключении к комнате.
 */
export interface RoomState
{
    room: Room;
    members: RoomMemberWithUser[];
    turnState: TurnState;
    activeSceneId: string | null;
}

/**
 * Входные данные для создания комнаты.
 */
export interface CreateRoomInput
{
    name: string;
}

/**
 * Входные данные для присоединения к комнате.
 */
export interface JoinRoomInput
{
    shortId: string;
    role?: Role;    // по умолчанию — "player"
}
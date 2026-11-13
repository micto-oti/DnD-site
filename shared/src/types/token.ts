/**
 * Статус, наложенный на токен.
 * Хранится как массив в поле `statuses` токена.
 */
export interface TokenStatus
{
    id: string;         // ссылка на statuses_library.id
    stacks: number;     // количество стаков
    count: number | null;
}

/**
 * Токен — фишка на сцене.
 * Соответствует записи в таблице `tokens`.
 *
 * Токены живут в комнате и НЕ привязаны к сцене.
 * При смене сцены токены остаются на своих координатах.
 */
export interface Token
{
    id: string;
    roomId: string;
    assetId: string | null;
    name: string;
    imageUrl: string | null;
    x: number;                          // проценты от ширины сцены (0–100)
    y: number;                          // проценты от высоты сцены (0–100)
    size: number;                       // множитель от BASE_TOKEN_SIZE_PX
    color: string;                      // для фона, если нет картинки
    ownerId: string | null;             // user_id владельца (или null)
    isMain: boolean;                    // главный токен игрока
    isOnline: boolean;                  // онлайн ли владелец
    hpCurrent: number | null;
    hpMax: number | null;
    spCurrent: number | null;
    spMax: number | null;
    level: number | null;
    experience: number | null;
    statuses: TokenStatus[];
    createdAt: string;
    updatedAt: string;
}

/**
 * Входные данные для создания токена.
 */
export interface CreateTokenInput
{
    name?: string;             // опционально, если есть assetId
    assetId?: string;
    imageUrl?: string;
    x?: number;
    y?: number;
    size?: number;
    color?: string;
    ownerId?: string | null;
    isMain?: boolean;
    hpCurrent?: number;
    hpMax?: number;
    spCurrent?: number;
    spMax?: number;
    level?: number;
    experience?: number;
}

/**
 * Входные данные для обновления токена.
 * Все поля опциональны — обновляем только переданные.
 */
export interface UpdateTokenInput
{
    name?: string;
    imageUrl?: string | null;
    x?: number;
    y?: number;
    size?: number;
    color?: string;
    ownerId?: string | null;
    hpCurrent?: number | null;
    hpMax?: number | null;
    spCurrent?: number | null;
    spMax?: number | null;
    level?: number | null;
    experience?: number | null;
    statuses?: TokenStatus[];
}

/**
 * Команда на перемещение токена.
 * Отдельный тип — потому что это самое частое действие (drag-n-drop).
 */
export interface MoveTokenInput
{
    x: number;
    y: number;
}

/**
 * Изменение HP токена.
 * Может быть как установкой точного значения, так и дельтой (+/−).
 */
export interface ChangeHpInput
{
    current?: number;       // точное значение
    delta?: number;         // изменение (+5, −3)
}

/**
 * Изменение SP токена.
 */
export interface ChangeSpInput
{
    current?: number;
    delta?: number;
}
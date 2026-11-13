/**
 * Сцена — фон с возможными дополнительными настройками.
 * Соответствует записи в таблице `scenes`.
 *
 * Токены, метки и рисунки НЕ привязаны к сцене — они живут в комнате.
 * При смене сцены меняется только фон.
 */
export interface Scene
{
    id: string;
    roomId: string;
    name: string;
    backgroundUrl: string | null;
    orderIndex: number;
    createdAt: string;
}

/**
 * Входные данные для создания сцены.
 */
export interface CreateSceneInput
{
    name: string;
    backgroundUrl?: string;
}

/**
 * Входные данные для обновления сцены.
 */
export interface UpdateSceneInput
{
    name?: string;
    backgroundUrl?: string | null;
    orderIndex?: number;
}
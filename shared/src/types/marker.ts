/**
 * Тип метки.
 * Пока только «точка». В будущем можно добавить «текст», «иконка» и т.д.
 */
export type MarkerType = "point";

/**
 * Метка на сцене.
 *
 * Метки живут в памяти сервера, не в БД.
 * Бывают временные (20 секунд) и постоянные.
 * Постоянные стираются при смене сцены и при завершении хода.
 * Временные стираются автоматически по таймеру.
 */
export interface Marker
{
    id: string;
    roomId: string;
    type: MarkerType;
    x: number;                      // проценты от ширины сцены (0–100)
    y: number;                      // проценты от высоты сцены (0–100)
    color: string;
    label: string | null;           // опциональный текст
    isTemporary: boolean;
    expiresAt: string | null;       // ISO-строка; null для постоянных
    authorId: string | null;
    createdAt: string;
}

/**
 * Входные данные для создания метки.
 *
 * `expiresAt` не передаётся — сервер сам считает на основе `isTemporary`.
 */
export interface CreateMarkerInput
{
    type?: MarkerType;              // по умолчанию — "point"
    x: number;
    y: number;
    color?: string;                 // по умолчанию — DEFAULT_MARKER_COLOR
    label?: string;
    isTemporary?: boolean;          // по умолчанию — true
}
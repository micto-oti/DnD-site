/**
 * Точка в пространстве сцены.
 * Координаты в процентах (0–100) от размеров сцены.
 */
export interface DrawingPoint
{
    x: number;
    y: number;
}

/**
 * Данные рисунка.
 * Discriminated union по полю `type`.
 *
 * Формат `data` зависит от типа:
 * - freehand — свободная линия, массив точек
 * - line — прямая линия, ровно 2 точки
 * - arrow — стрелка, ровно 2 точки (start → end)
 * - circle — круг, диагональ от start до end
 * - rect — прямоугольник, диагональ от start до end
 */
export type DrawingData =
    | { type: "freehand"; points: DrawingPoint[] }
    | { type: "line"; points: [DrawingPoint, DrawingPoint] }
    | { type: "arrow"; points: [DrawingPoint, DrawingPoint] }
    | { type: "circle"; start: DrawingPoint; end: DrawingPoint }
    | { type: "rect"; start: DrawingPoint; end: DrawingPoint }
    | { type: "triangle"; points: [DrawingPoint, DrawingPoint, DrawingPoint] }
    | { type: "text"; x: number; y: number; text: string; fontSize: number };

/**
 * Тип рисунка (выводится из DrawingData).
 */
export type DrawingType = DrawingData["type"];

/**
 * Рисунок на сцене.
 *
 * Рисунки живут в памяти сервера, не в БД.
 * Бывают временные (20 секунд) и постоянные.
 * Постоянные стираются при смене сцены и при завершении хода.
 * Временные стираются автоматически по таймеру.
 */
export interface Drawing
{
    id: string;
    roomId: string;
    data: DrawingData;
    color: string;
    strokeWidth: number;
    isTemporary: boolean;
    expiresAt: string | null;       // ISO-строка; null для постоянных
    authorId: string | null;
    createdAt: string;
}

/**
 * Входные данные для создания рисунка.
 *
 * `expiresAt` не передаётся — сервер сам считает на основе `isTemporary`.
 */
export interface CreateDrawingInput
{
    data: DrawingData;
    color?: string;                 // по умолчанию — DEFAULT_DRAWING_COLOR
    strokeWidth?: number;           // по умолчанию — DEFAULT_STROKE_WIDTH
    isTemporary?: boolean;          // по умолчанию — false
}
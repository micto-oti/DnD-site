/**
 * Конвертация координат между процентами (0–100) и пикселями.
 *
 * В проекте принято хранить координаты в процентах от размера сцены.
 * Это позволяет разным клиентам с разными разрешениями экранов
 * видеть одну и ту же картину без искажений.
 *
 * Пиксели используются только при рендере в Konva-сцене.
 */

/**
 * Преобразует процентную координату в пиксельную.
 *
 * @param percent — значение в диапазоне 0–100
 * @param totalPx — общий размер в пикселях (ширина или высота сцены)
 */
export function percentToPx(percent: number, totalPx: number): number
{
    return (percent / 100) * totalPx;
}

/**
 * Преобразует пиксельную координату в процентную.
 *
 * @param px — значение в пикселях
 * @param totalPx — общий размер в пикселях (ширина или высота сцены)
 */
export function pxToPercent(px: number, totalPx: number): number
{
    if (totalPx === 0)
    {
        return 0;
    }

    return (px / totalPx) * 100;
}

/**
 * Ограничивает значение диапазоном.
 * Используется, чтобы координаты не выходили за пределы 0–100.
 */
export function clampPercent(value: number): number
{
    return Math.max(0, Math.min(100, value));
}

/**
 * Округляет координату до заданной точности.
 * По умолчанию — 2 знака после запятой.
 * Это нужно, чтобы не гонять через WebSocket длинные дроби.
 */
export function roundPercent(value: number, decimals: number = 2): number
{
    const factor = Math.pow(10, decimals);

    return Math.round(value * factor) / factor;
}

/**
 * Нормализует координату: ограничивает 0–100 и округляет.
 * Основная функция для использования при сохранении.
 */
export function normalizePercent(value: number, decimals: number = 2): number
{
    return roundPercent(clampPercent(value), decimals);
}
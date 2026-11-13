/**
 * Один кубик в результате броска.
 */
export interface DieResult
{
    sides: number;
    value: number;
}

/**
 * Результат выполнения броска кубиков.
 * Хранится внутри Message, если isRoll: true.
 */
export interface RollData
{
    expression: string;             // исходная команда, например "2d6+3"
    dice: DieResult[];              // все выпавшие кубики
    modifier: number;               // суммарный модификатор (со знаком)
    total: number;                  // итог: sum(dice) + modifier
    breakdown: string;              // человекочитаемо: "[4, 3] + 3 = 10"
}
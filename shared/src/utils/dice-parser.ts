import { LIMITS } from "../constants/limits.js";
import type { DieResult, RollData } from "../types/roll.js";

/**
 * Режим броска для группы кубиков.
 */
export type DiceMode = "normal" | "advantage" | "disadvantage";

/**
 * Слагаемое формулы — группа кубиков.
 */
export interface DiceTerm
{
    kind: "dice";
    sign: 1 | -1;
    count: number;
    sides: number;
    mode: DiceMode;
}

/**
 * Слагаемое формулы — число (модификатор).
 */
export interface NumberTerm
{
    kind: "number";
    sign: 1 | -1;
    value: number;
}

/**
 * Одно слагаемое формулы.
 */
export type RollTerm = DiceTerm | NumberTerm;

/**
 * Результат парсинга команды /roll.
 * Промежуточный тип — используется только внутри dice-parser.
 */
export interface ParsedRoll
{
    terms: RollTerm[];
    raw: string;
}

// ============================================================
// Регулярки
// ============================================================

/**
 * Токен группы кубиков: "2d6", "d20", "2d20adv", "-1d4dis".
 */
const DICE_TOKEN_REGEX = /([+-]?)\s*(\d*)\s*d\s*(\d+)\s*(adv|dis)?/i;

/**
 * Токен числа-модификатора: "+5", "-3".
 */
const NUMBER_TOKEN_REGEX = /([+-])\s*(\d+)/;

// ============================================================
// Парсинг
// ============================================================

/**
 * Парсит строку команды броска.
 * Возвращает null, если строка невалидна.
 */
export function parseRollCommand(input: string): ParsedRoll | null
{
    const raw = input.trim().toLowerCase();

    if (raw.length === 0)
    {
        return null;
    }

    const terms: RollTerm[] = [];
    let cursor = 0;

    while (cursor < raw.length)
    {
        // Пропускаем пробелы
        while (cursor < raw.length && raw[cursor] === " ")
        {
            cursor += 1;
        }

        if (cursor >= raw.length)
        {
            break;
        }

        // Пробуем распарсить группу кубиков
        const diceMatch = raw.slice(cursor).match(DICE_TOKEN_REGEX);

        if (diceMatch && diceMatch.index === 0)
        {
            const signStr = diceMatch[1] ?? "";
            const countStr = diceMatch[2] ?? "";
            const sidesStr = diceMatch[3]!;
            const modeStr = diceMatch[4];

            const sign: 1 | -1 = signStr === "-" ? -1 : 1;
            const count = countStr ? Number(countStr) : 1;
            const sides = Number(sidesStr);
            let mode: DiceMode = "normal";

            if (modeStr)
            {
                mode = modeStr.toLowerCase() === "adv" ? "advantage" : "disadvantage";
            }

            // Валидация
            if (count < 1 || sides < 2)
            {
                return null;
            }

            // adv / dis только для 2d20
            if (mode !== "normal")
            {
                if (sides !== 20 || count !== 2)
                {
                    return null;
                }
            }

            // Если это не первое слагаемое и не было знака — ошибка
            if (terms.length > 0 && !signStr)
            {
                return null;
            }

            terms.push({
                kind: "dice",
                sign,
                count,
                sides,
                mode,
            });

            cursor += diceMatch[0].length;
            continue;
        }

        // Пробуем распарсить число-модификатор
        const numberMatch = raw.slice(cursor).match(NUMBER_TOKEN_REGEX);

        if (numberMatch && numberMatch.index === 0)
        {
            const signStr = numberMatch[1]!;
            const valueStr = numberMatch[2]!;

            const sign: 1 | -1 = signStr === "-" ? -1 : 1;
            const value = Number(valueStr);

            if (value < 1)
            {
                return null;
            }

            terms.push({
                kind: "number",
                sign,
                value,
            });

            cursor += numberMatch[0].length;
            continue;
        }

        // Если ничего не распарсилось — ошибка
        return null;
    }

    // Должен быть хотя бы один кубик
    const hasDice = terms.some((t) => t.kind === "dice");

    if (!hasDice)
    {
        return null;
    }

    // Проверка лимитов
    let totalDice = 0;
    let totalModifier = 0;

    for (const term of terms)
    {
        if (term.kind === "dice")
        {
            totalDice += term.count;

            if (term.sides > LIMITS.DICE_MAX_SIDES)
            {
                return null;
            }
        }
        else
        {
            totalModifier += term.value;
        }
    }

    if (totalDice > LIMITS.DICE_MAX_COUNT)
    {
        return null;
    }

    if (totalModifier > LIMITS.DICE_MAX_MODIFIER)
    {
        return null;
    }

    return { terms, raw };
}

// ============================================================
// Бросок
// ============================================================

/**
 * Кидает один кубик с N гранями.
 */
function rollDie(sides: number): number
{
    return Math.floor(Math.random() * sides) + 1;
}

/**
 * Результат обработки одного слагаемого.
 */
interface TermResult
{
    breakdown: string;
    value: number;
}

/**
 * Обрабатывает одно слагаемое формулы.
 */
function executeTerm(term: RollTerm, dice: DieResult[]): TermResult
{
    if (term.kind === "number")
    {
        const signStr = term.sign === -1 ? "−" : "+";

        return {
            breakdown: `${signStr} ${term.value}`,
            value: term.sign * term.value,
        };
    }

    // Слагаемое — кубики
    const rolled: number[] = [];

    for (let i = 0; i < term.count; i += 1)
    {
        const value = rollDie(term.sides);

        rolled.push(value);
        dice.push({ sides: term.sides, value });
    }

    const signStr = term.sign === -1 ? "−" : "+";
    const rolledStr = `[${rolled.join(", ")}]`;

    if (term.mode === "normal")
    {
        const sum = rolled.reduce((acc, v) => acc + v, 0);

        return {
            breakdown: `${signStr} ${rolledStr}`,
            value: term.sign * sum,
        };
    }

    // adv / dis — берём лучший / худший из двух
    const best = Math.max(...rolled);
    const worst = Math.min(...rolled);
    const chosen = term.mode === "advantage" ? best : worst;
    const tag = term.mode === "advantage" ? "adv" : "dis";

    return {
        breakdown: `${signStr} ${rolledStr} → ${chosen} (${tag})`,
        value: term.sign * chosen,
    };
}

/**
 * Выполняет бросок по распарсенной команде.
 */
export function executeRoll(parsed: ParsedRoll): RollData
{
    const dice: DieResult[] = [];
    const parts: string[] = [];
    let total = 0;
    let modifier = 0;

    for (const term of parsed.terms)
    {
        const result = executeTerm(term, dice);

        parts.push(result.breakdown);
        total += result.value;

        if (term.kind === "number")
        {
            modifier += term.sign * term.value;
        }
    }

    // Первое слагаемое: убираем ведущий "+ "
    let breakdown = parts.join(" ");

    if (breakdown.startsWith("+ "))
    {
        breakdown = breakdown.slice(2);
    }

    breakdown += ` = ${total}`;

    return {
        expression: parsed.raw,
        dice,
        modifier,
        total,
        breakdown,
    };
}
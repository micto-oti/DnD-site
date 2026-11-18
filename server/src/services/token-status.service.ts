import type { TokenStatus, StatusDefinition } from "@gm-table/shared";

export type StatusAction = "add" | "update" | "remove";
export class StatusError extends Error {
    constructor(public statusCode: number, message: string) { super(message); }
}
export function changeStatuses(current: TokenStatus[], definition: Pick<StatusDefinition, "id" | "hasCount" | "maxStacks" | "maxCount">, action: StatusAction, values?: { stacks: number; count: number | null }): TokenStatus[] {
    const existing = current.find((item) => item.id === definition.id);
    if (action === "remove") return current.filter((item) => item.id !== definition.id);
    if (action === "add") return existing ? current : [...current, { id: definition.id, stacks: 1, count: definition.hasCount ? 1 : null }];
    if (!existing) throw new StatusError(404, "Эффект уже снят с токена");
    if (!values || !Number.isInteger(values.stacks) || values.stacks < 0 || values.stacks > definition.maxStacks) throw new StatusError(400, "Недопустимая сила эффекта");
    if (definition.hasCount && (values.count === null || !Number.isInteger(values.count) || values.count < 0 || values.count > (definition.maxCount ?? 99))) throw new StatusError(400, "Недопустимый счётчик");
    if (!definition.hasCount && values.count !== null) throw new StatusError(400, "У этого эффекта нет счётчика");
    return current.map((item) => item.id === definition.id ? { id: item.id, stacks: values.stacks, count: values.count } : item);
}

import type { StatusDefinition } from "@gm-table/shared";
import { apiFetch } from "./client.js";

export type StatusDraft = Pick<StatusDefinition, "name" | "icon" | "color" | "hasCount">;
export function createStatus(roomId: string, input: StatusDraft): Promise<StatusDefinition> {
    return apiFetch(`/api/rooms/${encodeURIComponent(roomId)}/statuses`, { method: "POST", body: JSON.stringify(input) });
}
export function updateStatus(roomId: string, id: string, input: Omit<StatusDraft, "hasCount">): Promise<StatusDefinition> {
    return apiFetch(`/api/rooms/${encodeURIComponent(roomId)}/statuses/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}

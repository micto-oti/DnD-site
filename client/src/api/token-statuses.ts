import type { Token } from "@gm-table/shared";
import { apiFetch } from "./client.js";
import { useRoomStore } from "@/store/room.store.js";
import { useTokenStatusUi } from "@/store/token-status-ui.store.js";

export async function changeTokenStatus(tokenId: string, statusId: string, method: "POST" | "PATCH" | "DELETE", values?: { stacks: number; count: number | null }): Promise<Token> {
    const token = await apiFetch<Token>(`/api/tokens/${encodeURIComponent(tokenId)}/statuses/${encodeURIComponent(statusId)}`, { method, ...(values ? { body: JSON.stringify(values) } : {}) });
    if (useRoomStore.getState().room?.id === token.roomId) useRoomStore.getState().updateToken(token);
    return token;
}
export async function applyTokenStatus(tokenId: string, statusId: string): Promise<void> {
    const token = await changeTokenStatus(tokenId, statusId, "POST");
    if (useRoomStore.getState().room?.id === token.roomId) useTokenStatusUi.getState().open(tokenId, statusId);
}

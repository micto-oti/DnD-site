import { create } from "zustand";
export const useTokenStatusUi = create<{
    target: { tokenId: string; statusId: string | null } | null;
    open: (tokenId: string, statusId?: string) => void;
    close: () => void;
}>((set) => ({ target: null, open: (tokenId, statusId) => set({ target: { tokenId, statusId: statusId ?? null } }), close: () => set({ target: null }) }));

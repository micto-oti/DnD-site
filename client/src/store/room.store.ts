import { create } from "zustand";

import type {
    Asset,
    AssetFolder,
    Drawing,
    Marker,
    Message,
    Room,
    RoomMemberWithUser,
    StatusDefinition,
    Token,
    TurnStatus,
} from "@gm-table/shared";

interface RoomStore
{
    room: Room | null;
    members: RoomMemberWithUser[];
    turn: TurnStatus | null;
    tokens: Token[];
    drawings: Drawing[];
    markers: Marker[];
    statuses: StatusDefinition[];
    assets: Asset[];
    assetFolders: AssetFolder[];
    messages: Message[];

    setInitialState: (state: {
        room: Room;
        members: RoomMemberWithUser[];
        turn: TurnStatus;
        tokens: Token[];
        drawings: Drawing[];
        markers: Marker[];
        statuses: StatusDefinition[];
        assets: Asset[];
        assetFolders: AssetFolder[];
        messages: Message[];
    }) => void;

    addMember: (member: RoomMemberWithUser) => void;
    removeMember: (userId: string) => void;
    setMemberOnline: (userId: string, isOnline: boolean) => void;

    addToken: (token: Token) => void;
    updateToken: (token: Token) => void;
    moveToken: (tokenId: string, x: number, y: number) => void;
    setTokens: (tokens: Token[]) => void;
    removeToken: (tokenId: string) => void;

    reset: () => void;
}

const initialState = {
    room: null,
    members: [] as RoomMemberWithUser[],
    turn: null,
    tokens: [] as Token[],
    drawings: [] as Drawing[],
    markers: [] as Marker[],
    statuses: [] as StatusDefinition[],
    assets: [] as Asset[],
    assetFolders: [] as AssetFolder[],
    messages: [] as Message[],
};

export const useRoomStore = create<RoomStore>((set) => ({
    ...initialState,

    setInitialState: (state) =>
        set({
            room: state.room,
            members: state.members,
            turn: state.turn,
            tokens: state.tokens,
            drawings: state.drawings,
            markers: state.markers,
            statuses: state.statuses,
            assets: state.assets,
            assetFolders: state.assetFolders,
            messages: state.messages,
        }),

    addMember: (member) =>
        set((s) =>
        {
            const exists = s.members.some((m) => m.userId === member.userId);

            if (exists)
            {
                return {
                    members: s.members.map((m) =>
                        m.userId === member.userId ? member : m,
                    ),
                };
            }

            return { members: [...s.members, member] };
        }),

    setMemberOnline: (userId, isOnline) =>
        set((s) => ({
            members: s.members.map((m) =>
                m.userId === userId ? { ...m, isOnline } : m,
            ),
        })),

    addToken: (token) =>
        set((s) =>
        {
            if (s.tokens.some((t) => t.id === token.id))
            {
                return s;
            }

            return { tokens: [...s.tokens, token] };
        }),

    updateToken: (token) =>
        set((s) => ({
            tokens: s.tokens.map((t) => (t.id === token.id ? token : t)),
        })),

    moveToken: (tokenId, x, y) =>
        set((s) => ({
            tokens: s.tokens.map((t) =>
                t.id === tokenId ? { ...t, x, y } : t,
            ),
        })),

    setTokens: (tokens) => set({ tokens }),

    removeToken: (tokenId) =>
        set((s) => ({
            tokens: s.tokens.filter((t) => t.id !== tokenId),
        })),

    removeMember: (userId) =>
        set((s) => ({
            members: s.members.filter((m) => m.userId !== userId),
        })),

    reset: () => set(initialState),
}));
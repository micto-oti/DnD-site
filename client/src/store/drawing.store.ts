import { create } from "zustand";

import type { Drawing } from "@gm-table/shared";

interface DrawingStore
{
    drawings: Drawing[];

    setDrawings: (drawings: Drawing[]) => void;
    addDrawing: (drawing: Drawing) => void;
    removeDrawing: (drawingId: string) => void;
    updateDrawing: (drawing: Drawing) => void;
    clearOwn: (authorId: string) => void;
    clearAll: () => void;

    reset: () => void;
}

const initialState = {
    drawings: [] as Drawing[],
};

export const useDrawingStore = create<DrawingStore>((set) => ({
    ...initialState,

    setDrawings: (drawings) => set({ drawings }),

    addDrawing: (drawing) =>
        set((s) =>
        {
            if (s.drawings.some((d) => d.id === drawing.id))
            {
                return s;
            }

            return { drawings: [...s.drawings, drawing] };
        }),

    removeDrawing: (drawingId) =>
        set((s) => ({
            drawings: s.drawings.filter((d) => d.id !== drawingId),
        })),

    updateDrawing: (drawing) =>
        set((s) => ({
            drawings: s.drawings.map((d) =>
                d.id === drawing.id ? drawing : d,
            ),
        })),

    clearOwn: (authorId) =>
        set((s) => ({
            drawings: s.drawings.filter((d) => d.authorId !== authorId),
        })),

    clearAll: () => set({ drawings: [] }),

    reset: () => set(initialState),
}));
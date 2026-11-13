import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { DrawingType } from "@gm-table/shared";

/**
 * Активный инструмент.
 * null = курсор (выбор токенов).
 */

export type ActiveTool =
    | null
    | "freehand"
    | "line"
    | "arrow"
    | "circle"
    | "rect"
    | "triangle"
    | "text"
    | "eraser";

export type ToolCategory = "draw" | "line" | "shape" | "text" | "eraser";

interface UiStore
{
    activeTool: ActiveTool;
    activeCategory: ToolCategory | null;

    color: string;
    strokeWidth: number;
    isTemporary: boolean;
    textFontSize: number;

    setActiveTool: (tool: ActiveTool, category: ToolCategory | null) => void;
    setColor: (color: string) => void;
    setStrokeWidth: (w: number) => void;
    setIsTemporary: (v: boolean) => void;
    setTextFontSize: (size: number) => void;
    resetTool: () => void;
    /** Инициализировать цвет по умолчанию из токена (только если ничего не выбрано) */
    initColorIfEmpty: (fallback: string) => void;
}

export const useUiStore = create<UiStore>()(
    persist(
        (set, get) => ({
            activeTool: null,
            activeCategory: null,
            color: "#e74c3c",
            strokeWidth: 3,
            isTemporary: false,
            textFontSize: 16,

            setActiveTool: (activeTool, activeCategory) =>
                set({ activeTool, activeCategory }),

            setColor: (color) => set({ color }),
            setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
            setIsTemporary: (isTemporary) => set({ isTemporary }),
            setTextFontSize: (textFontSize) => set({ textFontSize }),

            resetTool: () => set({ activeTool: null, activeCategory: null }),

            initColorIfEmpty: (fallback) =>
            {
                const current = get().color;

                // Если цвет "дефолтный" (не менялся пользователем) — заменить
                // Мы не можем точно определить "менялся ли",
                // поэтому используем явный маркер: если цвет = "#e74c3c" (начальный) — заменяем
                if (current === "#e74c3c")
                {
                    set({ color: fallback });
                }
            },
        }),
        {
            name: "gm-table-ui",
            // persist только настройки, не активный инструмент
            partialize: (state) => ({
                color: state.color,
                strokeWidth: state.strokeWidth,
                isTemporary: state.isTemporary,
                textFontSize: state.textFontSize,
            }),
        },
    ),
);
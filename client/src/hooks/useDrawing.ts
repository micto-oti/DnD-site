import { useCallback, useRef, useState } from "react";
import type Konva from "konva";

import { getSocket } from "@/ws/socket.js";
import { useUiStore } from "@/store/ui.store.js";
import { DEFAULT_SCENE_HEIGHT, type DrawingData, type DrawingPoint, DEFAULT_SCENE_WIDTH } from "@gm-table/shared";

const SCENE_W = DEFAULT_SCENE_WIDTH;
const SCENE_H = DEFAULT_SCENE_HEIGHT;

interface DrawState
{
    isDrawing: boolean;
    startPoint: DrawingPoint | null;
    currentPoint: DrawingPoint | null;
    freehandPoints: DrawingPoint[];
    previewData: DrawingData | null;
}

/**
 * Хук для логики рисования.
 */
export function useDrawing(
    roomId: string,
    scale: number,
): {
    previewData: DrawingData | null;
    handleMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
    handleMouseMove: (e: Konva.KonvaEventObject<MouseEvent>) => void;
    handleMouseUp: (e: Konva.KonvaEventObject<MouseEvent>) => void;
    handleContextMenu: (e: Konva.KonvaEventObject<PointerEvent>) => void;
    handleStageClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
}
{
    const activeTool = useUiStore((s) => s.activeTool);
    const color = useUiStore((s) => s.color);
    const strokeWidth = useUiStore((s) => s.strokeWidth);
    const isTemporary = useUiStore((s) => s.isTemporary);
    const textFontSize = useUiStore((s) => s.textFontSize);
    const resetTool = useUiStore((s) => s.resetTool);

    const [state, setState] = useState<DrawState>({
        isDrawing: false,
        startPoint: null,
        currentPoint: null,
        freehandPoints: [],
        previewData: null,
    });

    const freehandRef = useRef<DrawingPoint[]>([]);

    /**
     * Конвертировать экранную точку в проценты от сцены.
     */
    const toPercent = useCallback(
        (x: number, y: number): DrawingPoint => ({
            x: (x / (SCENE_W * scale)) * 100,
            y: (y / (SCENE_H * scale)) * 100,
        }),
        [scale],
    );

    /**
     * Создать рисунок на сервере.
     */
    const emitDrawing = useCallback(
        (data: DrawingData): void =>
        {
            const socket = getSocket();

            socket.emit("drawing:create", {
                roomId,
                data,
                color,
                strokeWidth,
                isTemporary,
            });
        },
        [roomId, color, strokeWidth, isTemporary],
    );

    const handleMouseDown = useCallback(
        (e: Konva.KonvaEventObject<MouseEvent>): void =>
        {
            if (!activeTool || activeTool === "eraser" || activeTool === "text")
            {
                return;
            }

            const stage = e.target.getStage();
            const point = stage?.getPointerPosition();

            if (!point)
            {
                return;
            }

            const p = toPercent(point.x, point.y);

            if (activeTool === "freehand")
            {
                freehandRef.current = [p];

                setState({
                    isDrawing: true,
                    startPoint: p,
                    currentPoint: p,
                    freehandPoints: [p],
                    previewData: { type: "freehand", points: [p] },
                });

                return;
            }

            setState({
                isDrawing: true,
                startPoint: p,
                currentPoint: p,
                freehandPoints: [],
                previewData: null,
            });
        },
        [activeTool, toPercent],
    );

    const handleMouseMove = useCallback(
        (e: Konva.KonvaEventObject<MouseEvent>): void =>
        {
            if (!state.isDrawing || !activeTool)
            {
                return;
            }

            const stage = e.target.getStage();
            const point = stage?.getPointerPosition();

            if (!point)
            {
                return;
            }

            const p = toPercent(point.x, point.y);

            if (activeTool === "freehand")
            {
                freehandRef.current.push(p);

                setState((s) => ({
                    ...s,
                    currentPoint: p,
                    freehandPoints: [...freehandRef.current],
                    previewData: {
                        type: "freehand",
                        points: [...freehandRef.current],
                    },
                }));

                return;
            }

            const start = state.startPoint!;

            setState((s) => ({
                ...s,
                currentPoint: p,
                previewData: buildPreview(activeTool, start, p),
            }));
        },
        [state.isDrawing, state.startPoint, activeTool, toPercent],
    );

    const handleMouseUp = useCallback(
        (): void =>
        {
            if (!state.isDrawing || !state.previewData || !activeTool)
            {
                return;
            }

            emitDrawing(state.previewData);

            setState({
                isDrawing: false,
                startPoint: null,
                currentPoint: null,
                freehandPoints: [],
                previewData: null,
            });

            freehandRef.current = [];
        },
        [state.isDrawing, state.previewData, activeTool, emitDrawing],
    );

    /**
     * ПКМ — сбросить инструмент.
     */
    const handleContextMenu = useCallback(
        (e: Konva.KonvaEventObject<PointerEvent>): void =>
        {
            e.evt.preventDefault();
            resetTool();
        },
        [resetTool],
    );

    /**
     * Клик по сцене — для текста и ластика.
     */
    const handleStageClick = useCallback(
        (e: Konva.KonvaEventObject<MouseEvent>): void =>
        {
            if (!activeTool)
            {
                return;
            }

            const stage = e.target.getStage();
            const point = stage?.getPointerPosition();

            if (!point)
            {
                return;
            }

            if (activeTool === "text")
            {
                const p = toPercent(point.x, point.y);

                const text = window.prompt("Введите текст:");

                if (text && text.trim().length > 0)
                {
                    emitDrawing({
                        type: "text",
                        x: p.x,
                        y: p.y,
                        text: text.trim(),
                        fontSize: textFontSize,
                    });
                }
            }
        },
        [activeTool, textFontSize, toPercent, emitDrawing],
    );

    return {
        previewData: state.previewData,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleContextMenu,
        handleStageClick,
    };
}

/**
 * Построить preview по инструменту.
 */
function buildPreview(
    tool: string,
    start: DrawingPoint,
    end: DrawingPoint,
): DrawingData | null
{
    switch (tool)
    {
        case "line":
            return { type: "line", points: [start, end] };

        case "arrow":
            return { type: "arrow", points: [start, end] };

        case "circle":
            return { type: "circle", start, end };

        case "rect":
            return { type: "rect", start, end };

        case "triangle":
            return {
                type: "triangle",
                points: [start, { x: end.x, y: start.y }, end],
            };

        default:
            return null;
    }
}
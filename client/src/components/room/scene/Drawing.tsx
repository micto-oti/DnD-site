import { Arrow, Circle, Line, Rect } from "react-konva";

import type { Drawing as DrawingType, DrawingPoint } from "@gm-table/shared";
import { DEFAULT_SCENE_HEIGHT, DEFAULT_SCENE_WIDTH } from "@gm-table/shared";

interface DrawingProps
{
    drawing: DrawingType;
    scale: number;
    isOwn: boolean;
    listening: boolean;
    onClick: () => void;
}

const SCENE_W = DEFAULT_SCENE_WIDTH;
const SCENE_H = DEFAULT_SCENE_HEIGHT;

/**
 * Один рисунок на сцене.
 */
function Drawing({ drawing, scale, isOwn, listening, onClick }: DrawingProps): React.JSX.Element | null
{
    const { data, color, strokeWidth } = drawing;

    // Прозрачность: свой — 100%, чужой — 60%
    const opacity = isOwn ? 1 : 0.6;

    const convertPoint = (p: DrawingPoint): { x: number; y: number } => ({
        x: (p.x / 100) * (SCENE_W * scale),
        y: (p.y / 100) * (SCENE_H * scale),
    });

    const commonProps = {
        stroke: color,
        strokeWidth: strokeWidth * scale,
        opacity,
        listening,
        onClick,
        hitStrokeWidth: Math.max(20, strokeWidth * scale + 16),
    };

    switch (data.type)
    {
        case "freehand":
        {
            const points = data.points.flatMap((p) =>
            {
                const { x, y } = convertPoint(p);

                return [x, y];
            });

            return (
                <Line
                    points={points}
                    tension={0.4}
                    lineCap="round"
                    lineJoin="round"
                    {...commonProps}
                />
            );
        }

        case "line":
        {
            const [a, b] = data.points;
            const pa = convertPoint(a);
            const pb = convertPoint(b);

            return (
                <Line
                    points={[pa.x, pa.y, pb.x, pb.y]}
                    lineCap="round"
                    {...commonProps}
                />
            );
        }

        case "arrow":
        {
            const [a, b] = data.points;
            const pa = convertPoint(a);
            const pb = convertPoint(b);

            return (
                <Arrow
                    points={[pa.x, pa.y, pb.x, pb.y]}
                    pointerLength={Math.max(8, 8 * scale)}
                    pointerWidth={Math.max(8, 8 * scale)}
                    lineCap="round"
                    {...commonProps}
                />
            );
        }

        case "circle":
        {
            const start = convertPoint(data.start);
            const end = convertPoint(data.end);

            const cx = (start.x + end.x) / 2;
            const cy = (start.y + end.y) / 2;
            const radius = Math.hypot(end.x - start.x, end.y - start.y) / 2;

            return (
                <Circle
                    x={cx}
                    y={cy}
                    radius={radius}
                    {...commonProps}
                />
            );
        }

        case "rect":
        {
            const start = convertPoint(data.start);
            const end = convertPoint(data.end);

            const x = Math.min(start.x, end.x);
            const y = Math.min(start.y, end.y);
            const width = Math.abs(end.x - start.x);
            const height = Math.abs(end.y - start.y);

            return (
                <Rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    {...commonProps}
                />
            );
        }

        case "triangle":
        {
            const [a, b, c] = data.points;
            const pa = convertPoint(a);
            const pb = convertPoint(b);
            const pc = convertPoint(c);

            return (
                <Line
                    points={[pa.x, pa.y, pb.x, pb.y, pc.x, pc.y]}
                    closed
                    lineJoin="round"
                    {...commonProps}
                />
            );
        }

        case "text":
        {
            // Текст рендерится в TextLayer
            return null;
        }
    }
}

export default Drawing;
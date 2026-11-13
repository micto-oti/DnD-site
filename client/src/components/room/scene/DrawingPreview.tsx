import { Arrow, Circle, Line, Rect } from "react-konva";

import { useUiStore } from "@/store/ui.store.js";
import type { DrawingData, DrawingPoint } from "@gm-table/shared";

interface DrawingPreviewProps
{
    data: DrawingData;
    scale: number;
}

const SCENE_W = 1920;
const SCENE_H = 1080;

function DrawingPreview({ data, scale }: DrawingPreviewProps): React.JSX.Element | null
{
    const color = useUiStore((s) => s.color);
    const strokeWidth = useUiStore((s) => s.strokeWidth);
    const textFontSize = useUiStore((s) => s.textFontSize);

    const convertPoint = (p: DrawingPoint): { x: number; y: number } => ({
        x: (p.x / 100) * (SCENE_W * scale),
        y: (p.y / 100) * (SCENE_H * scale),
    });

    const commonProps = {
        stroke: color,
        strokeWidth: strokeWidth * scale,
        listening: false,
        opacity: 0.7,
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

            return <Circle x={cx} y={cy} radius={radius} {...commonProps} />;
        }

        case "rect":
        {
            const start = convertPoint(data.start);
            const end = convertPoint(data.end);

            const x = Math.min(start.x, end.x);
            const y = Math.min(start.y, end.y);
            const width = Math.abs(end.x - start.x);
            const height = Math.abs(end.y - start.y);

            return <Rect x={x} y={y} width={width} height={height} {...commonProps} />;
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
            return null;
    }
}

export default DrawingPreview;
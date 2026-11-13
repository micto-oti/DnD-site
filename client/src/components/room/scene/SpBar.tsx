import { Group, Rect, Text } from "react-konva";

interface SpBarProps
{
    current: number;
    max: number;
    radius: number;
    scale: number;
    yOffset: number;
}

/**
 * SP-бар под токеном.
 */
function SpBar({
    current,
    max,
    radius,
    scale,
    yOffset,
}: SpBarProps): React.JSX.Element
{
    const width = radius * 2;
    const height = Math.max(3, 4 * scale);
    const percent = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;

    const bgColor = "#1a1a3a";
    const fillColor = "#3498db";

    const textFontSize = Math.max(8, height * 2);
    const showText = height >= 6;

    return (
        <Group x={-radius} y={yOffset}>
            <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill={bgColor}
                cornerRadius={height / 2}
            />
            <Rect
                x={0}
                y={0}
                width={width * percent}
                height={height}
                fill={fillColor}
                cornerRadius={height / 2}
            />
            {showText && (
                <Text
                    text={`${current} / ${max}`}
                    fontSize={textFontSize}
                    fill="#fff"
                    width={width}
                    align="center"
                    y={(height - textFontSize) / 2}
                    listening={false}
                />
            )}
        </Group>
    );
}

export default SpBar;
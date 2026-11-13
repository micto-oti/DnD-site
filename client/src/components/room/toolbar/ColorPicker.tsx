import { COLOR_PALETTE } from "@gm-table/shared";

interface ColorPickerProps
{
    value: string;
    onChange: (color: string) => void;
}

/**
 * Простая палитра быстрых цветов.
 */
function ColorPicker({ value, onChange }: ColorPickerProps): React.JSX.Element
{
    return (
        <div style={styles.container}>
            <div style={styles.label}>Цвет</div>
            <div style={styles.palette}>
                {COLOR_PALETTE.map((c) => (
                    <button
                        key={c}
                        onClick={() => onChange(c)}
                        style={{
                            ...styles.colorButton,
                            background: c,
                            ...(value === c ? styles.colorButtonActive : {}),
                        }}
                        aria-label={`Цвет ${c}`}
                    />
                ))}
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.375rem",
    },
    label: {
        fontSize: "0.6875rem",
        color: "#888",
        textTransform: "uppercase" as const,
    },
    palette: {
        display: "flex",
        flexWrap: "wrap" as const,
        gap: "0.25rem",
    },
    colorButton: {
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        border: "2px solid transparent",
        cursor: "pointer",
        padding: 0,
    },
    colorButtonActive: {
        borderColor: "#fff",
    },
};

export default ColorPicker;
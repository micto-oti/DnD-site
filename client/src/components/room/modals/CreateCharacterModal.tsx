import { useState } from "react";

import { uploadFile } from "@/api/upload.js";
import Modal from "@/components/common/Modal.js";
import { COLOR_PALETTE } from "@gm-table/shared";

interface CreateCharacterModalProps
{
    open: boolean;
    onClose: () => void;
    onCreate: (data: {
        name: string;
        color: string;
        imageUrl?: string;
        hpCurrent: number;
        hpMax: number;
        spCurrent: number;
        spMax: number;
        level: number;
        experience: number;
    }) => Promise<void>;
}

/**
 * Модалка создания главного токена игрока.
 * Открывается при первом входе в комнату.
 */
function CreateCharacterModal({
    open,
    onClose,
    onCreate,
}: CreateCharacterModalProps): React.JSX.Element
{
    const [name, setName] = useState("");
    const [color, setColor] = useState(() => pickRandomColor());
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent): Promise<void> =>
    {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try
        {
            let imageUrl: string | undefined;

            if (file)
            {
                const { url } = await uploadFile(file);

                imageUrl = url;
            }

            await onCreate({
                name,
                color,
                imageUrl,
                hpCurrent: 10,
                hpMax: 10,
                spCurrent: 45,
                spMax: 45,
                level: 1,
                experience: 0,
            });

            // Сброс формы
            setName("");
            setFile(null);
            setColor(pickRandomColor());
        }
        catch (err)
        {
            setError(err instanceof Error ? err.message : "Ошибка");
        }
        finally
        {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title="Создать персонажа">
            <form onSubmit={handleSubmit} style={styles.form}>
                <label style={styles.label}>
                    Имя персонажа
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        maxLength={50}
                        disabled={loading}
                        style={styles.input}
                        placeholder="Например, Торак"
                    />
                </label>

                <label style={styles.label}>
                    Цвет токена
                    <div style={styles.palette}>
                        {COLOR_PALETTE.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setColor(c)}
                                style={{
                                    ...styles.colorButton,
                                    background: c,
                                    ...(color === c ? styles.colorButtonActive : {}),
                                }}
                                disabled={loading}
                                aria-label={`Цвет ${c}`}
                            />
                        ))}
                    </div>
                </label>

                <label style={styles.label}>
                    Аватар (опционально)
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        disabled={loading}
                        style={styles.file}
                    />
                </label>

                {error && <div style={styles.error}>{error}</div>}

                <div style={styles.actions}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        style={styles.cancel}
                    >
                        Позже
                    </button>
                    <button type="submit" disabled={loading} style={styles.submit}>
                        {loading ? "Создание..." : "Создать"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

/**
 * Случайный цвет из палитры.
 */
function pickRandomColor(): string
{
    return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)] ?? "#3498db";
}

const styles = {
    form: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "1rem",
    },
    label: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.375rem",
        fontSize: "0.875rem",
        color: "#aaa",
    },
    input: {
        padding: "0.75rem",
        background: "#1a1a1d",
        border: "1px solid #3a3a3e",
        borderRadius: "4px",
        color: "#e8e8e8",
        fontSize: "1rem",
    },
    palette: {
        display: "flex",
        flexWrap: "wrap" as const,
        gap: "0.375rem",
    },
    colorButton: {
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        border: "2px solid transparent",
        cursor: "pointer",
        padding: 0,
    },
    colorButtonActive: {
        borderColor: "#fff",
        boxShadow: "0 0 0 2px #3a7bd5",
    },
    file: {
        color: "#e8e8e8",
        fontSize: "0.875rem",
    },
    error: {
        color: "#e74c3c",
        fontSize: "0.875rem",
    },
    actions: {
        display: "flex",
        gap: "0.5rem",
        justifyContent: "flex-end",
        marginTop: "0.5rem",
    },
    cancel: {
        padding: "0.5rem 1rem",
        background: "#2a2a2e",
        color: "#e8e8e8",
        borderRadius: "4px",
        fontSize: "0.875rem",
    },
    submit: {
        padding: "0.5rem 1rem",
        background: "#3a7bd5",
        color: "#fff",
        borderRadius: "4px",
        fontSize: "0.875rem",
        fontWeight: 500,
    },
};

export default CreateCharacterModal;
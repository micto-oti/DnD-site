import { useState } from "react";

import Modal from "@/components/common/Modal.js";

interface JoinRoomModalProps
{
    open: boolean;
    onClose: () => void;
    onJoin: (shortId: string) => Promise<void>;
}

function JoinRoomModal({ open, onClose, onJoin }: JoinRoomModalProps): React.JSX.Element
{
    const [shortId, setShortId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent): Promise<void> =>
    {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try
        {
            await onJoin(shortId.trim().toLowerCase());
            setShortId("");
            onClose();
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
        <Modal open={open} onClose={onClose} title="Присоединиться">
            <form onSubmit={handleSubmit} style={styles.form}>
                <input
                    type="text"
                    placeholder="ID комнаты"
                    value={shortId}
                    onChange={(e) => setShortId(e.target.value)}
                    required
                    maxLength={20}
                    disabled={loading}
                    style={styles.input}
                />
                <button type="submit" disabled={loading} style={styles.button}>
                    {loading ? "Подключение..." : "Присоединиться"}
                </button>
                {error && <div style={styles.error}>{error}</div>}
            </form>
        </Modal>
    );
}

const styles = {
    form: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "1rem",
    },
    input: {
        padding: "0.75rem",
        background: "#1a1a1d",
        border: "1px solid #3a3a3e",
        borderRadius: "4px",
        color: "#e8e8e8",
        fontSize: "1rem",
        fontFamily: "monospace",
    },
    button: {
        padding: "0.75rem",
        background: "#3a7bd5",
        color: "#fff",
        borderRadius: "4px",
        fontSize: "1rem",
        fontWeight: 500,
    },
    error: {
        color: "#e74c3c",
        fontSize: "0.875rem",
    },
};

export default JoinRoomModal;
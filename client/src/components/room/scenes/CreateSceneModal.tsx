import { useState } from "react";

import { uploadFile } from "@/api/upload.js";
import Modal from "@/components/common/Modal.js";

interface CreateSceneModalProps
{
    open: boolean;
    onClose: () => void;
    onCreate: (name: string, backgroundUrl?: string) => Promise<void>;
}

function CreateSceneModal({ open, onClose, onCreate }: CreateSceneModalProps): React.JSX.Element
{
    const [name, setName] = useState("");
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
            let backgroundUrl: string | undefined;

            if (file)
            {
                const { url } = await uploadFile(file);

                backgroundUrl = url;
            }

            await onCreate(name, backgroundUrl);

            setName("");
            setFile(null);
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
        <Modal open={open} onClose={onClose} title="Создать сцену">
            <form onSubmit={handleSubmit} style={styles.form}>
                <input
                    type="text"
                    placeholder="Название сцены"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={50}
                    disabled={loading}
                    style={styles.input}
                />

                <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    disabled={loading}
                    style={styles.file}
                />

                <button type="submit" disabled={loading} style={styles.button}>
                    {loading ? "Создание..." : "Создать"}
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
    },
    file: {
        color: "#e8e8e8",
        fontSize: "0.875rem",
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

export default CreateSceneModal;
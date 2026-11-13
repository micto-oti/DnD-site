import { useEffect, useState } from "react";

import { updateScene } from "@/api/scenes.js";
import { uploadFile } from "@/api/upload.js";
import Modal from "@/components/common/Modal.js";
import { useSceneStore } from "@/store/scene.store.js";
import type { Scene } from "@gm-table/shared";

const API_URL = import.meta.env.VITE_API_URL;

interface SceneEditModalProps
{
    open: boolean;
    scene: Scene | null;
    onClose: () => void;
}

function SceneEditModal({
    open,
    scene,
    onClose,
}: SceneEditModalProps): React.JSX.Element | null
{
    const updateSceneInStore = useSceneStore((s) => s.updateScene);

    const [name, setName] = useState("");
    const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() =>
    {
        if (open && scene)
        {
            setName(scene.name);
            setBackgroundUrl(scene.backgroundUrl);
            setError(null);
        }
    }, [open, scene]);

    if (!scene)
    {
        return null;
    }

    const handleUpload = async (file: File): Promise<void> =>
    {
        setUploading(true);
        setError(null);

        try
        {
            const { url } = await uploadFile(file);

            setBackgroundUrl(url);
        }
        catch (err)
        {
            setError(err instanceof Error ? err.message : "Ошибка загрузки");
        }
        finally
        {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent): Promise<void> =>
    {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try
        {
            const updated = await updateScene(scene.id, {
                name,
                backgroundUrl,
            });

            updateSceneInStore(updated);
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
        <Modal open={open} onClose={onClose} title="Редактировать сцену">
            <form onSubmit={handleSubmit} style={styles.form}>
                <label style={styles.label}>
                    Название
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        maxLength={50}
                        disabled={loading}
                        style={styles.input}
                    />
                </label>

                <div style={styles.label}>
                    Фон
                    <div style={styles.imageRow}>
                        {backgroundUrl ? (
                            <img
                                src={`${API_URL}${backgroundUrl}`}
                                alt="preview"
                                style={styles.preview}
                            />
                        ) : (
                            <div style={styles.previewEmpty}>нет</div>
                        )}

                        <div style={styles.imageButtons}>
                            <label style={styles.uploadButton}>
                                {uploading ? "Загрузка..." : "Загрузить"}
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                    onChange={(e) =>
                                    {
                                        const file = e.target.files?.[0];

                                        if (file)
                                        {
                                            void handleUpload(file);
                                        }
                                    }}
                                    disabled={uploading || loading}
                                    style={{ display: "none" }}
                                />
                            </label>

                            {backgroundUrl && (
                                <button
                                    type="button"
                                    onClick={() => setBackgroundUrl(null)}
                                    disabled={loading}
                                    style={styles.removeButton}
                                >
                                    Убрать
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {error && <div style={styles.error}>{error}</div>}

                <div style={styles.actions}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        style={styles.cancel}
                    >
                        Отмена
                    </button>
                    <button type="submit" disabled={loading} style={styles.submit}>
                        {loading ? "Сохранение..." : "Сохранить"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

const styles = {
    form: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.75rem",
    },
    label: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.375rem",
        fontSize: "0.8125rem",
        color: "#aaa",
    },
    input: {
        padding: "0.5rem 0.625rem",
        background: "#1a1a1d",
        border: "1px solid #3a3a3e",
        borderRadius: "4px",
        color: "#e8e8e8",
        fontSize: "0.875rem",
    },
    imageRow: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
    },
    preview: {
        width: "80px",
        height: "45px",
        objectFit: "cover" as const,
        borderRadius: "4px",
        border: "1px solid #3a3a3e",
    },
    previewEmpty: {
        width: "80px",
        height: "45px",
        borderRadius: "4px",
        border: "1px dashed #3a3a3e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.75rem",
        color: "#666",
    },
    imageButtons: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.25rem",
    },
    uploadButton: {
        padding: "0.25rem 0.5rem",
        background: "#2a2a2e",
        borderRadius: "4px",
        fontSize: "0.75rem",
        cursor: "pointer",
    },
    removeButton: {
        padding: "0.25rem 0.5rem",
        background: "transparent",
        color: "#e74c3c",
        fontSize: "0.75rem",
        borderRadius: "4px",
    },
    error: {
        color: "#e74c3c",
        fontSize: "0.8125rem",
    },
    actions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "0.5rem",
        marginTop: "0.25rem",
    },
    cancel: {
        padding: "0.5rem 1rem",
        background: "#2a2a2e",
        color: "#e8e8e8",
        borderRadius: "4px",
        fontSize: "0.8125rem",
    },
    submit: {
        padding: "0.5rem 1rem",
        background: "#3a7bd5",
        color: "#fff",
        borderRadius: "4px",
        fontSize: "0.8125rem",
        fontWeight: 500,
    },
};

export default SceneEditModal;
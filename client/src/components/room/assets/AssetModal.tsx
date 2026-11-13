import { useEffect, useState } from "react";

import { createAsset, updateAsset } from "@/api/assets.js";
import { uploadFile } from "@/api/upload.js";
import Modal from "@/components/common/Modal.js";
import { useAssetStore } from "@/store/asset.store.js";
import { COLOR_PALETTE } from "@gm-table/shared";
import type { Asset } from "@gm-table/shared";

const API_URL = import.meta.env.VITE_API_URL;

interface AssetModalProps
{
    open: boolean;
    onClose: () => void;
    roomId: string;
    folderId: string | null;
    /** Если задан — редактирование. Если null — создание. */
    asset: Asset | null;
}

interface FormState
{
    name: string;
    color: string;
    imageUrl: string | null;
    hasHpSp: boolean;
    hpCurrent: number;
    hpMax: number;
    spCurrent: number;
    spMax: number;
    hasLevelExp: boolean;
    level: number;
    experience: number;
    size: number;
}

function emptyForm(): FormState
{
    return {
        name: "",
        color: pickRandomColor(),
        imageUrl: null,
        hasHpSp: false,
        hpCurrent: 10,
        hpMax: 10,
        spCurrent: 45,
        spMax: 45,
        hasLevelExp: false,
        level: 1,
        experience: 0,
        size: 1,
    };
}

function formFromAsset(asset: Asset): FormState
{
    const hasHpSp = asset.hpCurrent !== null || asset.hpMax !== null || asset.spCurrent !== null || asset.spMax !== null;
    const hasLevelExp = asset.level !== null || asset.experience !== null;

    return {
        name: asset.name,
        color: asset.color,
        imageUrl: asset.imageUrl,
        hasHpSp,
        hpCurrent: asset.hpCurrent ?? 10,
        hpMax: asset.hpMax ?? 10,
        spCurrent: asset.spCurrent ?? 45,
        spMax: asset.spMax ?? 45,
        hasLevelExp,
        level: asset.level ?? 1,
        experience: asset.experience ?? 0,
        size: asset.size,
    };
}

/**
 * Модалка создания/редактирования ассета.
 * Если `asset` задан — редактирование, иначе — создание.
 */
function AssetModal({
    open,
    onClose,
    roomId,
    folderId,
    asset,
}: AssetModalProps): React.JSX.Element
{
    const addAsset = useAssetStore((s) => s.addAsset);
    const updateAssetInStore = useAssetStore((s) => s.updateAsset);

    const [form, setForm] = useState<FormState>(() =>
        asset ? formFromAsset(asset) : emptyForm()
    );

    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Сбрасываем форму при открытии/смене ассета
    useEffect(() =>
    {
        if (open)
        {
            setForm(asset ? formFromAsset(asset) : emptyForm());
            setError(null);
        }
    }, [open, asset?.id]);

    const handleUpload = async (file: File): Promise<void> =>
    {
        setUploading(true);
        setError(null);

        try
        {
            const { url } = await uploadFile(file);

            setForm((f) => ({ ...f, imageUrl: url }));
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
            if (asset)
            {
                // Редактирование
                const updated = await updateAsset(asset.id, {
                    name: form.name,
                    color: form.color,
                    imageUrl: form.imageUrl,
                    hpCurrent: form.hasHpSp ? form.hpCurrent : null,
                    hpMax: form.hasHpSp ? form.hpMax : null,
                    spCurrent: form.hasHpSp ? form.spCurrent : null,
                    spMax: form.hasHpSp ? form.spMax : null,
                    level: form.hasLevelExp ? form.level : null,
                    experience: form.hasLevelExp ? form.experience : null,
                    size: form.size,
                });

                updateAssetInStore(updated);
            }
            else
            {
                // Создание
                const created = await createAsset(roomId, {
                    name: form.name,
                    color: form.color,
                    imageUrl: form.imageUrl ?? undefined,
                    folderId,
                    size: form.size,
                    hpCurrent: form.hasHpSp ? form.hpCurrent : undefined,
                    hpMax: form.hasHpSp ? form.hpMax : undefined,
                    spCurrent: form.hasHpSp ? form.spCurrent : undefined,
                    spMax: form.hasHpSp ? form.spMax : undefined,
                    level: form.hasLevelExp ? form.level : undefined,
                    experience: form.hasLevelExp ? form.experience : undefined,
                });

                addAsset(created);
            }

            onClose();
        }
        catch (err)
        {
            setError(err instanceof Error ? err.message : "Ошибка сохранения");
        }
        finally
        {
            setLoading(false);
        }
    };

    const handleClose = (): void =>
    {
        if (!loading)
        {
            onClose();
        }
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title={asset ? "Редактировать ассет" : "Создать ассет"}
        >
            <form onSubmit={handleSubmit} style={styles.form}>
                {/* Имя */}
                <label style={styles.label}>
                    Имя
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        required
                        maxLength={100}
                        disabled={loading}
                        style={styles.input}
                        placeholder="Например, Гоблин"
                    />
                </label>

                {/* Картинка */}
                <div style={styles.label}>
                    Изображение
                    <div style={styles.imageRow}>
                        {form.imageUrl ? (
                            <img
                                src={`${API_URL}${form.imageUrl}`}
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

                            {form.imageUrl && (
                                <button
                                    type="button"
                                    onClick={() => setForm((f) => ({ ...f, imageUrl: null }))}
                                    disabled={loading}
                                    style={styles.removeButton}
                                >
                                    Убрать
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Цвет */}
                <div style={styles.label}>
                    Цвет
                    <div style={styles.palette}>
                        {COLOR_PALETTE.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setForm((f) => ({ ...f, color: c }))}
                                style={{
                                    ...styles.colorButton,
                                    background: c,
                                    ...(form.color === c ? styles.colorButtonActive : {}),
                                }}
                                disabled={loading}
                                aria-label={`Цвет ${c}`}
                            />
                        ))}
                    </div>
                </div>

                {/* HP/SP */}
                <div style={styles.toggleRow}>
                    <label style={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={form.hasHpSp}
                            onChange={(e) => setForm((f) => ({ ...f, hasHpSp: e.target.checked }))}
                            disabled={loading}
                        />
                        HP / SP
                    </label>
                </div>

                {form.hasHpSp && (
                    <div style={styles.resourceGrid}>
                        <label style={styles.smallLabel}>
                            HP тек.
                            <input
                                type="number"
                                value={form.hpCurrent}
                                onChange={(e) => setForm((f) => ({ ...f, hpCurrent: Number(e.target.value) }))}
                                disabled={loading}
                                style={styles.numberInput}
                            />
                        </label>
                        <label style={styles.smallLabel}>
                            HP макс.
                            <input
                                type="number"
                                value={form.hpMax}
                                onChange={(e) => setForm((f) => ({ ...f, hpMax: Number(e.target.value) }))}
                                disabled={loading}
                                style={styles.numberInput}
                            />
                        </label>
                        <label style={styles.smallLabel}>
                            SP тек.
                            <input
                                type="number"
                                value={form.spCurrent}
                                onChange={(e) => setForm((f) => ({ ...f, spCurrent: Number(e.target.value) }))}
                                disabled={loading}
                                style={styles.numberInput}
                            />
                        </label>
                        <label style={styles.smallLabel}>
                            SP макс.
                            <input
                                type="number"
                                value={form.spMax}
                                onChange={(e) => setForm((f) => ({ ...f, spMax: Number(e.target.value) }))}
                                disabled={loading}
                                style={styles.numberInput}
                            />
                        </label>
                    </div>
                )}

                {/* Level/Experience */}
                <div style={styles.toggleRow}>
                    <label style={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={form.hasLevelExp}
                            onChange={(e) => setForm((f) => ({ ...f, hasLevelExp: e.target.checked }))}
                            disabled={loading}
                        />
                        Уровень / Опыт
                    </label>
                </div>

                {form.hasLevelExp && (
                    <div style={styles.resourceGrid}>
                        <label style={styles.smallLabel}>
                            Уровень
                            <input
                                type="number"
                                value={form.level}
                                onChange={(e) => setForm((f) => ({ ...f, level: Number(e.target.value) }))}
                                disabled={loading}
                                style={styles.numberInput}
                            />
                        </label>
                        <label style={styles.smallLabel}>
                            Опыт
                            <input
                                type="number"
                                value={form.experience}
                                onChange={(e) => setForm((f) => ({ ...f, experience: Number(e.target.value) }))}
                                disabled={loading}
                                style={styles.numberInput}
                            />
                        </label>
                    </div>
                )}

                {/* Размер */}
                <div style={styles.label}>
                    Размер
                    <div style={styles.sizeRow}>
                        {[0.5, 1, 1.5, 2, 3, 4].map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setForm((f) => ({ ...f, size: s }))}
                                disabled={loading}
                                style={{
                                    ...styles.sizeButton,
                                    ...(form.size === s ? styles.sizeButtonActive : {}),
                                }}
                            >
                                {s}×
                            </button>
                        ))}
                    </div>
                </div>

                {error && <div style={styles.error}>{error}</div>}

                <div style={styles.actions}>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={loading}
                        style={styles.cancel}
                    >
                        Отмена
                    </button>
                    <button type="submit" disabled={loading} style={styles.submit}>
                        {loading ? "Сохранение..." : (asset ? "Сохранить" : "Создать")}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function pickRandomColor(): string
{
    return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)] ?? "#3498db";
}

const styles = {
    // ... те же стили, что в CreateAssetModal
    form: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.75rem",
        maxHeight: "70vh",
        overflowY: "auto" as const,
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
    numberInput: {
        padding: "0.375rem 0.5rem",
        background: "#1a1a1d",
        border: "1px solid #3a3a3e",
        borderRadius: "4px",
        color: "#e8e8e8",
        fontSize: "0.8125rem",
        width: "100%",
        boxSizing: "border-box" as const,
    },
    smallLabel: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.25rem",
        fontSize: "0.75rem",
        color: "#888",
    },
    imageRow: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
    },
    preview: {
        width: "48px",
        height: "48px",
        borderRadius: "50%",
        objectFit: "cover" as const,
        border: "1px solid #3a3a3e",
    },
    previewEmpty: {
        width: "48px",
        height: "48px",
        borderRadius: "50%",
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
    palette: {
        display: "flex",
        flexWrap: "wrap" as const,
        gap: "0.25rem",
    },
    colorButton: {
        width: "26px",
        height: "26px",
        borderRadius: "50%",
        border: "2px solid transparent",
        cursor: "pointer",
        padding: 0,
    },
    colorButtonActive: {
        borderColor: "#fff",
    },
    toggleRow: {
        display: "flex",
        alignItems: "center",
    },
    checkboxLabel: {
        display: "flex",
        alignItems: "center",
        gap: "0.375rem",
        fontSize: "0.8125rem",
        color: "#e8e8e8",
        cursor: "pointer",
    },
    resourceGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.5rem",
    },
    sizeRow: {
        display: "flex",
        gap: "0.25rem",
        flexWrap: "wrap" as const,
    },
    sizeButton: {
        padding: "0.375rem 0.625rem",
        background: "#2a2a2e",
        borderRadius: "4px",
        fontSize: "0.75rem",
        color: "#e8e8e8",
    },
    sizeButtonActive: {
        background: "#3a7bd5",
        color: "#fff",
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

export default AssetModal;
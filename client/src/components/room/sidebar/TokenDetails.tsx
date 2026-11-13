import { useEffect, useState } from "react";

import { uploadFile } from "@/api/upload.js";
import { getSocket } from "@/ws/socket.js";
import { COLOR_PALETTE } from "@gm-table/shared";
import type { Token } from "@gm-table/shared";
import ConfirmModal from "@/components/common/ConfirmModal.js";

const API_URL = import.meta.env.VITE_API_URL;

interface TokenDetailsProps
{
    token: Token;
    isGm: boolean;
    myUserId: string | null;
}

interface Draft
{
    name: string;
    color: string;
    imageUrl: string | null;
    hpCurrent: number | null;
    hpMax: number | null;
    spCurrent: number | null;
    spMax: number | null;
    level: number | null;
    experience: number | null;
    size: number;
}

function buildDraft(token: Token): Draft
{
    return {
        name: token.name,
        color: token.color,
        imageUrl: token.imageUrl,
        hpCurrent: token.hpCurrent,
        hpMax: token.hpMax,
        spCurrent: token.spCurrent,
        spMax: token.spMax,
        level: token.level,
        experience: token.experience,
        size: token.size,
    };
}

/**
 * Свойства выбранного токена.
 * Если пользователь — владелец или GM, можно редактировать.
 */
function TokenDetails({ token, isGm, myUserId }: TokenDetailsProps): React.JSX.Element
{
    const [draft, setDraft] = useState<Draft>(() => buildDraft(token));
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Сбрасываем draft, если сменился токен или пришли обновления
    useEffect(() =>
    {
        setDraft(buildDraft(token));
        setError(null);
    }, [token.id, token.updatedAt]);

    const canEdit = isGm || (myUserId !== null && token.ownerId === myUserId);

    const dirty = isDirty(draft, token);

    const handleSave = (): void =>
    {
        setError(null);

        const patch: Record<string, unknown> = {};

        if (draft.name !== token.name) patch.name = draft.name;
        if (draft.color !== token.color) patch.color = draft.color;
        if (draft.imageUrl !== token.imageUrl) patch.imageUrl = draft.imageUrl;
        if (draft.hpCurrent !== token.hpCurrent) patch.hpCurrent = draft.hpCurrent;
        if (draft.hpMax !== token.hpMax) patch.hpMax = draft.hpMax;
        if (draft.spCurrent !== token.spCurrent) patch.spCurrent = draft.spCurrent;
        if (draft.spMax !== token.spMax) patch.spMax = draft.spMax;
        if (draft.level !== token.level) patch.level = draft.level;
        if (draft.experience !== token.experience) patch.experience = draft.experience;
        if (draft.size !== token.size) patch.size = draft.size;

        if (Object.keys(patch).length === 0)
        {
            return;
        }

        const socket = getSocket();

        socket.emit("token:update", {
            tokenId: token.id,
            patch,
        });
    };

    const handleUpload = async (file: File): Promise<void> =>
    {
        setUploading(true);
        setError(null);

        try
        {
            const { url } = await uploadFile(file);

            setDraft((d) => ({ ...d, imageUrl: url }));
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

    const handleDelete = (): void => setConfirmDelete(true);

    const handleDeleteConfirm = (): void =>
    {
        const socket = getSocket();
        socket.emit("token:delete", { tokenId: token.id });
        setConfirmDelete(false);
    };

    return (
        <>
            <div style={styles.container}>
                {/* Заголовок */}
                <div style={styles.header}>
                    <div
                        style={{
                            ...styles.colorDot,
                            background: draft.color,
                        }}
                    />
                    <div style={styles.name}>{token.name}</div>
                    {!canEdit && <div style={styles.readonly}>только чтение</div>}
                </div>

                {/* Имя */}
                <Field label="Имя">
                    <input
                        type="text"
                        value={draft.name}
                        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                        disabled={!canEdit}
                        maxLength={50}
                        style={styles.input}
                    />
                </Field>

                {/* Цвет */}
                {canEdit && (
                    <Field label="Цвет">
                        <div style={styles.palette}>
                            {COLOR_PALETTE.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setDraft((d) => ({ ...d, color: c }))}
                                    style={{
                                        ...styles.colorButton,
                                        background: c,
                                        ...(draft.color === c ? styles.colorButtonActive : {}),
                                    }}
                                    aria-label={`Цвет ${c}`}
                                />
                            ))}
                        </div>
                    </Field>
                )}

                {/* Картинка */}
                {canEdit && (
                    <Field label="Аватар">
                        <div style={styles.imageRow}>
                            {draft.imageUrl ? (
                                <img
                                    src={`${API_URL}${draft.imageUrl}`}
                                    alt="avatar"
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
                                        disabled={uploading}
                                        style={{ display: "none" }}
                                    />
                                </label>

                                {draft.imageUrl && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDraft((d) => ({ ...d, imageUrl: null }))
                                        }
                                        style={styles.smallButton}
                                    >
                                        Удалить
                                    </button>
                                )}
                            </div>
                        </div>
                    </Field>
                )}

                {/* HP */}
                <ResourceRow
                    label="HP"
                    current={draft.hpCurrent}
                    max={draft.hpMax}
                    onChangeCurrent={(v) => setDraft((d) => ({ ...d, hpCurrent: v }))}
                    onChangeMax={(v) => setDraft((d) => ({ ...d, hpMax: v }))}
                    disabled={!canEdit}
                />

                {/* SP */}
                <ResourceRow
                    label="SP"
                    current={draft.spCurrent}
                    max={draft.spMax}
                    onChangeCurrent={(v) => setDraft((d) => ({ ...d, spCurrent: v }))}
                    onChangeMax={(v) => setDraft((d) => ({ ...d, spMax: v }))}
                    disabled={!canEdit}
                />

                {/* Level */}
                <NumberRow
                    label="Уровень"
                    value={draft.level}
                    onChange={(v) => setDraft((d) => ({ ...d, level: v }))}
                    disabled={!canEdit}
                />

                {/* Experience */}
                <NumberRow
                    label="Опыт"
                    value={draft.experience}
                    onChange={(v) => setDraft((d) => ({ ...d, experience: v }))}
                    disabled={!canEdit}
                />

                {/* Размер */}
                {canEdit && (
                    <Field label="Размер">
                        <div style={styles.sizeRow}>
                            {[0.5, 1, 1.5, 2, 3, 4].map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setDraft((d) => ({ ...d, size: s }))}
                                    style={{
                                        ...styles.sizeButton,
                                        ...(draft.size === s ? styles.sizeButtonActive : {}),
                                    }}
                                >
                                    {s}×
                                </button>
                            ))}
                        </div>
                    </Field>
                )}

                {error && <div style={styles.error}>{error}</div>}

                {/* Действия */}
                {canEdit && (
                    <div style={styles.actions}>
                        {isGm && !token.isMain && (
                            <button onClick={handleDelete} style={styles.deleteButton}>
                                Удалить
                            </button>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={!dirty}
                            style={{
                                ...styles.saveButton,
                                ...(dirty ? {} : styles.saveButtonDisabled),
                            }}
                        >
                            Сохранить
                        </button>
                    </div>
                )}
            </div>

            <ConfirmModal
                open={confirmDelete}
                title={`Удалить токен "${token.name}"?`}
                message="Это действие нельзя отменить."
                confirmLabel="Удалить"
                danger
                onConfirm={handleDeleteConfirm}
                onCancel={() => setConfirmDelete(false)}
            />
        </>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}): React.JSX.Element
{
    return (
        <div style={styles.field}>
            <div style={styles.fieldLabel}>{label}</div>
            {children}
        </div>
    );
}

function ResourceRow({
    label,
    current,
    max,
    onChangeCurrent,
    onChangeMax,
    disabled,
}: {
    label: string;
    current: number | null;
    max: number | null;
    onChangeCurrent: (v: number | null) => void;
    onChangeMax: (v: number | null) => void;
    disabled: boolean;
}): React.JSX.Element
{
    const enabled = current !== null && max !== null;

    const toggle = (): void =>
    {
        if (enabled)
        {
            onChangeCurrent(null);
            onChangeMax(null);
        }
        else
        {
            onChangeCurrent(0);
            onChangeMax(0);
        }
    };

    return (
        <div style={styles.field}>
            <div style={styles.fieldLabelRow}>
                <span>{label}</span>
                {!disabled && (
                    <button type="button" onClick={toggle} style={styles.toggleButton}>
                        {enabled ? "убрать" : "добавить"}
                    </button>
                )}
            </div>
            {enabled ? (
                <div style={styles.resourceRow}>
                    <input
                        type="number"
                        value={current}
                        onChange={(e) =>
                            onChangeCurrent(e.target.value === "" ? 0 : Number(e.target.value))
                        }
                        disabled={disabled}
                        style={styles.numberInput}
                    />
                    <span style={styles.slash}>/</span>
                    <input
                        type="number"
                        value={max}
                        onChange={(e) =>
                            onChangeMax(e.target.value === "" ? 0 : Number(e.target.value))
                        }
                        disabled={disabled}
                        style={styles.numberInput}
                    />
                </div>
            ) : (
                <div style={styles.emptyResource}>—</div>
            )}
        </div>
    );
}

function NumberRow({
    label,
    value,
    onChange,
    disabled,
}: {
    label: string;
    value: number | null;
    onChange: (v: number | null) => void;
    disabled: boolean;
}): React.JSX.Element
{
    return (
        <div style={styles.field}>
            <div style={styles.fieldLabelRow}>
                <span>{label}</span>
                {!disabled && (
                    <button
                        type="button"
                        onClick={() => onChange(value === null ? 0 : null)}
                        style={styles.toggleButton}
                    >
                        {value === null ? "добавить" : "убрать"}
                    </button>
                )}
            </div>
            {value !== null ? (
                <input
                    type="number"
                    value={value}
                    onChange={(e) =>
                        onChange(e.target.value === "" ? 0 : Number(e.target.value))
                    }
                    disabled={disabled}
                    style={styles.input}
                />
            ) : (
                <div style={styles.emptyResource}>—</div>
            )}
        </div>
    );
}

function isDirty(draft: Draft, token: Token): boolean
{
    return (
        draft.name !== token.name ||
        draft.color !== token.color ||
        draft.imageUrl !== token.imageUrl ||
        draft.hpCurrent !== token.hpCurrent ||
        draft.hpMax !== token.hpMax ||
        draft.spCurrent !== token.spCurrent ||
        draft.spMax !== token.spMax ||
        draft.level !== token.level ||
        draft.experience !== token.experience ||
        draft.size !== token.size
    );
}

const styles = {
    container: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.75rem",
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
    },
    colorDot: {
        width: "16px",
        height: "16px",
        borderRadius: "50%",
        flexShrink: 0,
    },
    name: {
        fontWeight: 500,
        fontSize: "0.9375rem",
        flex: 1,
    },
    readonly: {
        fontSize: "0.6875rem",
        color: "#888",
        textTransform: "uppercase" as const,
    },
    field: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.375rem",
    },
    fieldLabel: {
        fontSize: "0.75rem",
        color: "#888",
    },
    fieldLabelRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "0.75rem",
        color: "#888",
    },
    input: {
        padding: "0.375rem 0.5rem",
        background: "#0a0a0c",
        border: "1px solid #3a3a3e",
        borderRadius: "4px",
        color: "#e8e8e8",
        fontSize: "0.8125rem",
        width: "100%",
        boxSizing: "border-box" as const,
    },
    numberInput: {
        padding: "0.375rem 0.5rem",
        background: "#0a0a0c",
        border: "1px solid #3a3a3e",
        borderRadius: "4px",
        color: "#e8e8e8",
        fontSize: "0.8125rem",
        width: "60px",
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
    imageRow: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
    },
    preview: {
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        objectFit: "cover" as const,
        border: "1px solid #3a3a3e",
    },
    previewEmpty: {
        width: "40px",
        height: "40px",
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
    smallButton: {
        padding: "0.25rem 0.5rem",
        background: "transparent",
        color: "#e74c3c",
        fontSize: "0.75rem",
        borderRadius: "4px",
    },
    resourceRow: {
        display: "flex",
        alignItems: "center",
        gap: "0.25rem",
    },
    slash: {
        color: "#666",
    },
    emptyResource: {
        color: "#666",
        fontSize: "0.8125rem",
    },
    toggleButton: {
        fontSize: "0.6875rem",
        color: "#3a7bd5",
        cursor: "pointer",
    },
    sizeRow: {
        display: "flex",
        gap: "0.25rem",
    },
    sizeButton: {
        padding: "0.25rem 0.5rem",
        background: "#2a2a2e",
        borderRadius: "4px",
        fontSize: "0.75rem",
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
        justifyContent: "space-between",
        gap: "0.5rem",
        marginTop: "0.5rem",
    },
    deleteButton: {
        padding: "0.5rem 0.75rem",
        background: "transparent",
        color: "#e74c3c",
        border: "1px solid #e74c3c",
        borderRadius: "4px",
        fontSize: "0.8125rem",
    },
    saveButton: {
        padding: "0.5rem 1rem",
        background: "#3a7bd5",
        color: "#fff",
        borderRadius: "4px",
        fontSize: "0.8125rem",
        fontWeight: 500,
    },
    saveButtonDisabled: {
        opacity: 0.4,
        cursor: "not-allowed" as const,
    },
};

export default TokenDetails;
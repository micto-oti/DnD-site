import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { getSocket } from "@/ws/socket.js";
import type { Token } from "@gm-table/shared";
import ConfirmModal from "@/components/common/ConfirmModal.js";

interface TokenContextMenuProps
{
    token: Token;
    position: { x: number; y: number };
    canEdit: boolean;
    isGm: boolean;
    onClose: () => void;
}

const MENU_WIDTH = 200;
const MENU_MAX_HEIGHT = 400;

/**
 * Контекстное меню токена (ПКМ на сцене).
 * Быстрые действия: ±HP, ±SP, ±Опыт, уровень.
 */
function TokenContextMenu({
    token,
    position,
    canEdit,
    isGm,
    onClose,
}: TokenContextMenuProps): React.JSX.Element
{
    const menuRef = useRef<HTMLDivElement>(null);
    const [finalPos, setFinalPos] = useState({ x: position.x, y: position.y });
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Автопозиционирование
    useLayoutEffect(() =>
    {
        const menu = menuRef.current;

        if (!menu)
        {
            return;
        }

        const rect = menu.getBoundingClientRect();

        let x = position.x;
        let y = position.y;

        if (x + rect.width > window.innerWidth)
        {
            x = window.innerWidth - rect.width - 8;
        }

        if (y + rect.height > window.innerHeight)
        {
            y = window.innerHeight - rect.height - 8;
        }

        if (y < 8) y = 8;
        if (x < 8) x = 8;

        setFinalPos({ x, y });
    }, [position.x, position.y]);

    // Закрытие
    useEffect(() =>
    {
        const handler = (e: MouseEvent): void =>
        {
            // Не закрываем меню, если открыта модалка
            if (confirmDelete)
            {
                return;
            }

            if (menuRef.current && !menuRef.current.contains(e.target as Node))
            {
                onClose();
            }
        };

        const timeout = setTimeout(() =>
        {
            document.addEventListener("mousedown", handler);
        }, 0);

        return () =>
        {
            clearTimeout(timeout);
            document.removeEventListener("mousedown", handler);
        };
    }, [onClose, confirmDelete]);

    useEffect(() =>
    {
        const handler = (e: KeyboardEvent): void =>
        {
            if (e.key === "Escape")
            {
                onClose();
            }
        };

        document.addEventListener("keydown", handler);

        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    /**
     * Отправить обновление токена на сервер.
     */
    const sendPatch = (patch: Record<string, unknown>): void =>
    {
        const socket = getSocket();

        socket.emit("token:update", { tokenId: token.id, patch });
    };

    const adjustHp = (delta: number): void =>
    {
        if (token.hpCurrent === null || token.hpMax === null)
        {
            return;
        }

        const newHp = Math.max(0, Math.min(token.hpMax, token.hpCurrent + delta));

        sendPatch({ hpCurrent: newHp });
    };

    const adjustSp = (delta: number): void =>
    {
        if (token.spCurrent === null || token.spMax === null)
        {
            return;
        }

        const newSp = Math.max(0, Math.min(token.spMax, token.spCurrent + delta));

        sendPatch({ spCurrent: newSp });
    };

    const adjustExp = (delta: number): void =>
    {
        if (token.experience === null)
        {
            return;
        }

        const newExp = Math.max(0, token.experience + delta);

        sendPatch({ experience: newExp });
    };

    const handleDelete = (): void => setConfirmDelete(true);

    const handleDeleteConfirm = (): void =>
    {
        const socket = getSocket();
        socket.emit("token:delete", { tokenId: token.id });
        setConfirmDelete(false);
        onClose();
    };

    return (
        <>
            <div
                ref={menuRef}
                style={{
                    ...styles.menu,
                    left: finalPos.x,
                    top: finalPos.y,
                    width: `${MENU_WIDTH}px`,
                    maxHeight: `${MENU_MAX_HEIGHT}px`,
                }}
            >
                <div style={styles.header}>
                    <span
                        style={{
                            ...styles.colorDot,
                            background: token.color,
                        }}
                    />
                    <span style={styles.headerName}>{token.name}</span>
                </div>

                {!canEdit && (
                    <div style={styles.readonly}>Только чтение</div>
                )}

                {canEdit && token.hpCurrent !== null && token.hpMax !== null && (
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>
                            HP: {token.hpCurrent} / {token.hpMax}
                        </div>
                        <div style={styles.buttonRow}>
                            {[-10, -5, -1].map((d) => (
                                <button
                                    key={d}
                                    onClick={() => adjustHp(d)}
                                    style={styles.deltaButton}
                                >
                                    {d}
                                </button>
                            ))}
                            {[1, 5, 10].map((d) => (
                                <button
                                    key={d}
                                    onClick={() => adjustHp(d)}
                                    style={styles.deltaButton}
                                >
                                    +{d}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {canEdit && token.spCurrent !== null && token.spMax !== null && (
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>
                            SP: {token.spCurrent} / {token.spMax}
                        </div>
                        <div style={styles.buttonRow}>
                            {[-10, -5, -1].map((d) => (
                                <button
                                    key={d}
                                    onClick={() => adjustSp(d)}
                                    style={styles.deltaButton}
                                >
                                    {d}
                                </button>
                            ))}
                            {[1, 5, 10].map((d) => (
                                <button
                                    key={d}
                                    onClick={() => adjustSp(d)}
                                    style={styles.deltaButton}
                                >
                                    +{d}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {canEdit && token.experience !== null && (
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>
                            Опыт: {token.experience}
                        </div>
                        <div style={styles.buttonRow}>
                            {[-100, -10, -1].map((d) => (
                                <button
                                    key={d}
                                    onClick={() => adjustExp(d)}
                                    style={styles.deltaButton}
                                >
                                    {d}
                                </button>
                            ))}
                            {[1, 10, 100].map((d) => (
                                <button
                                    key={d}
                                    onClick={() => adjustExp(d)}
                                    style={styles.deltaButton}
                                >
                                    +{d}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {canEdit && token.level !== null && (
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>
                            Уровень: {token.level}
                        </div>
                        <div style={styles.buttonRow}>
                            <button
                                onClick={() => sendPatch({ level: Math.max(1, (token.level ?? 1) - 1) })}
                                style={styles.deltaButton}
                            >
                                −1
                            </button>
                            <button
                                onClick={() => sendPatch({ level: (token.level ?? 1) + 1 })}
                                style={styles.deltaButton}
                            >
                                +1
                            </button>
                        </div>
                    </div>
                )}

                {isGm && !token.isMain && (
                    <>
                        <div style={styles.divider} />
                        <button
                            onClick={handleDelete}
                            style={styles.deleteButton}
                        >
                            Удалить токен
                        </button>
                    </>
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

const styles = {
    menu: {
        position: "fixed" as const,
        background: "#2a2a2e",
        border: "1px solid #3a3a3e",
        borderRadius: "6px",
        padding: "0.5rem",
        zIndex: 2000,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
        display: "flex",
        flexDirection: "column" as const,
        overflow: "hidden" as const,
        overflowY: "auto" as const,
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        paddingBottom: "0.5rem",
        marginBottom: "0.25rem",
        borderBottom: "1px solid #3a3a3e",
    },
    colorDot: {
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        flexShrink: 0,
    },
    headerName: {
        fontSize: "0.875rem",
        fontWeight: 500,
        color: "#e8e8e8",
        overflow: "hidden" as const,
        textOverflow: "ellipsis",
        whiteSpace: "nowrap" as const,
    },
    readonly: {
        padding: "0.5rem 0",
        fontSize: "0.75rem",
        color: "#888",
        textAlign: "center" as const,
    },
    section: {
        paddingBottom: "0.5rem",
        marginBottom: "0.25rem",
    },
    sectionTitle: {
        fontSize: "0.75rem",
        color: "#aaa",
        marginBottom: "0.375rem",
    },
    buttonRow: {
        display: "flex",
        gap: "0.25rem",
        flexWrap: "wrap" as const,
    },
    deltaButton: {
        flex: "1 1 auto",
        padding: "0.375rem 0.5rem",
        background: "#1a1a1d",
        border: "1px solid #3a3a3e",
        borderRadius: "4px",
        fontSize: "0.75rem",
        color: "#e8e8e8",
        cursor: "pointer",
        minWidth: "36px",
    },
    divider: {
        height: "1px",
        background: "#3a3a3e",
        margin: "0.25rem 0",
    },
    deleteButton: {
        padding: "0.5rem 0.75rem",
        textAlign: "left" as const,
        fontSize: "0.8125rem",
        color: "#e74c3c",
        borderRadius: "4px",
        cursor: "pointer",
    },
};

export default TokenContextMenu;
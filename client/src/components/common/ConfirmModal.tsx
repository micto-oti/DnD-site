import { useEffect } from "react";

import Modal from "./Modal.js";

interface ConfirmModalProps
{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Модалка подтверждения действия.
 */
function ConfirmModal({
    open,
    title,
    message,
    confirmLabel = "Подтвердить",
    cancelLabel = "Отмена",
    danger = false,
    onConfirm,
    onCancel,
}: ConfirmModalProps): React.JSX.Element
{
    useEffect(() =>
    {
        if (!open)
        {
            return;
        }

        const handler = (e: KeyboardEvent): void =>
        {
            if (e.key === "Escape")
            {
                onCancel();
            }

            if (e.key === "Enter")
            {
                onConfirm();
            }
        };

        document.addEventListener("keydown", handler);

        return () => document.removeEventListener("keydown", handler);
    }, [open, onCancel, onConfirm]);

    return (
        <Modal open={open} onClose={onCancel} title={title}>
            <div style={styles.message}>{message}</div>
            <div style={styles.actions}>
                <button onClick={onCancel} style={styles.cancel}>
                    {cancelLabel}
                </button>
                <button
                    onClick={onConfirm}
                    style={{
                        ...styles.confirm,
                        ...(danger ? styles.confirmDanger : {}),
                    }}
                >
                    {confirmLabel}
                </button>
            </div>
        </Modal>
    );
}

const styles = {
    message: {
        fontSize: "0.9375rem",
        color: "#e8e8e8",
        marginBottom: "1.25rem",
        lineHeight: 1.5,
    },
    actions: {
        display: "flex",
        gap: "0.5rem",
        justifyContent: "flex-end",
    },
    cancel: {
        padding: "0.5rem 1rem",
        background: "#2a2a2e",
        color: "#e8e8e8",
        borderRadius: "4px",
        fontSize: "0.875rem",
        cursor: "pointer",
        border: "none",
    },
    confirm: {
        padding: "0.5rem 1rem",
        background: "#3a7bd5",
        color: "#fff",
        borderRadius: "4px",
        fontSize: "0.875rem",
        fontWeight: 500,
        cursor: "pointer",
        border: "none",
    },
    confirmDanger: {
        background: "#e74c3c",
    },
};

export default ConfirmModal;
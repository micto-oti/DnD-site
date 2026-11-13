import { useEffect } from "react";

interface ModalProps
{
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

function Modal({ open, onClose, title, children }: ModalProps): React.JSX.Element | null
{
    useEffect(() =>
    {
        if (!open)
        {
            return;
        }

        const handleEscape = (e: KeyboardEvent): void =>
        {
            if (e.key === "Escape")
            {
                onClose();
            }
        };

        window.addEventListener("keydown", handleEscape);

        return () => window.removeEventListener("keydown", handleEscape);
    }, [open, onClose]);

    if (!open)
    {
        return null;
    }

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                {title && <h2 style={styles.title}>{title}</h2>}
                {children}
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: "fixed" as const,
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
    },
    modal: {
        background: "#2a2a2e",
        borderRadius: "8px",
        padding: "1.5rem",
        minWidth: "320px",
        maxWidth: "480px",
    },
    title: {
        marginBottom: "1rem",
        fontSize: "1.25rem",
    },
};

export default Modal;
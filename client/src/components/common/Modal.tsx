import { useEffect, useId } from "react";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: "default" | "wide";
    ariaLabel?: string;
}

function Modal({
    open,
    onClose,
    title,
    children,
    size = "default",
    ariaLabel,
}: ModalProps): React.JSX.Element | null {
    const titleId = useId();

    useEffect(() => {
        if (!open) {
            return;
        }

        const handleEscape = (e: KeyboardEvent): void => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleEscape);

        return () => window.removeEventListener("keydown", handleEscape);
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title ? undefined : ariaLabel}
                aria-labelledby={title ? titleId : undefined}
                style={{
                    ...styles.modal,
                    ...(size === "wide" ? styles.wideModal : {}),
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <h2 id={titleId} style={styles.title}>
                        {title}
                    </h2>
                )}
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
        minWidth: "min(320px, calc(100vw - 2rem))",
        maxWidth: "480px",
        boxSizing: "border-box" as const,
    },
    wideModal: {
        width: "calc(100% - 1rem)",
        height: "min(85%, calc(100dvh - 1rem))",
        minWidth: 0,
        maxWidth: "70%",
        padding: 0,
        overflow: "hidden" as const,
    },
    title: {
        marginBottom: "1rem",
        fontSize: "1.25rem",
    },
};

export default Modal;

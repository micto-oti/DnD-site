import { useEffect, useState } from "react";

import { updateMe } from "@/api/users.js";
import Modal from "@/components/common/Modal.js";
import type { User } from "@gm-table/shared";

interface ProfileModalProps
{
    open: boolean;
    user: User | null;
    onClose: () => void;
    onUpdate: (user: User) => void;
}

function ProfileModal({
    open,
    user,
    onClose,
    onUpdate,
}: ProfileModalProps): React.JSX.Element | null
{
    const [nickname, setNickname] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() =>
    {
        if (open && user)
        {
            setNickname(user.nickname);
            setError(null);
        }
    }, [open, user]);

    if (!user)
    {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent): Promise<void> =>
    {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try
        {
            const updated = await updateMe({ nickname });

            onUpdate(updated);
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
        <Modal open={open} onClose={onClose} title="Профиль">
            <form onSubmit={handleSubmit} style={styles.form}>
                <label style={styles.label}>
                    Email
                    <input
                        type="text"
                        value={user.email}
                        disabled
                        style={styles.inputDisabled}
                    />
                </label>

                <label style={styles.label}>
                    Ник
                    <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        minLength={3}
                        maxLength={20}
                        required
                        disabled={loading}
                        style={styles.input}
                    />
                </label>

                {error && <div style={styles.error}>{error}</div>}

                <div style={styles.actions}>
                    <button type="button" onClick={onClose} disabled={loading} style={styles.cancel}>
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
    inputDisabled: {
        padding: "0.5rem 0.625rem",
        background: "#0a0a0c",
        border: "1px solid #2a2a2e",
        borderRadius: "4px",
        color: "#666",
        fontSize: "0.875rem",
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

export default ProfileModal;
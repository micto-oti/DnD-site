import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { login } from "@/api/auth.js";
import { setToken } from "@/api/client.js";

function LoginPage(): React.JSX.Element
{
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent): Promise<void> =>
    {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try
        {
            const response = await login(email);

            setToken(response.token);
            localStorage.setItem("userId", response.user.id);
            navigate("/lobby");
        }
        catch (err)
        {
            setError(err instanceof Error ? err.message : "Login failed");
        }
        finally
        {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <form onSubmit={handleSubmit} style={styles.form}>
                <input
                    type="email"
                    placeholder="Введите почту"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    style={styles.input}
                />
                <button type="submit" disabled={loading} style={styles.button}>
                    {loading ? "Вход..." : "Войти"}
                </button>
                {error && <div style={styles.error}>{error}</div>}
            </form>
        </div>
    );
}

const styles = {
    container: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
    },
    form: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "1rem",
        width: "320px",
    },
    input: {
        padding: "0.75rem",
        fontSize: "1rem",
        background: "#2a2a2e",
        border: "1px solid #3a3a3e",
        borderRadius: "4px",
        color: "#e8e8e8",
    },
    button: {
        padding: "0.75rem",
        fontSize: "1rem",
        background: "#3a7bd5",
        color: "#fff",
        borderRadius: "4px",
        fontWeight: 500,
    },
    error: {
        color: "#e74c3c",
        fontSize: "0.875rem",
        textAlign: "center" as const,
    },
};

export default LoginPage;
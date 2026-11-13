import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { me } from "@/api/auth.js";
import { clearToken } from "@/api/client.js";
import { createRoom, getRooms, joinRoom } from "@/api/rooms.js";
import CreateOrJoinModal from "@/components/lobby/CreateOrJoinModal.js";
import RoomCard from "@/components/lobby/RoomCard.js";
import ProfileModal from "@/components/profile/ProfileModal.js";

import type { Room, User } from "@gm-table/shared";

function LobbyPage(): React.JSX.Element
{
    const [user, setUser] = useState<User | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const navigate = useNavigate();
    const [profileOpen, setProfileOpen] = useState(false);

    useEffect(() =>
    {
        const loadData = async (): Promise<void> =>
        {
            try
            {
                const [userData, roomsData] = await Promise.all([me(), getRooms()]);

                setUser(userData);
                setRooms(roomsData);
            }
            catch
            {
                clearToken();
                navigate("/login");
            }
            finally
            {
                setLoading(false);
            }
        };

        void loadData();
    }, [navigate]);

    const handleLogout = (): void =>
    {
        clearToken();
        localStorage.removeItem("userId");
        navigate("/login");
    };

    const handleCreate = async (name: string): Promise<void> =>
    {
        const room = await createRoom({ name });

        navigate(`/room/${room.id}`);
    };

    const handleJoin = async (shortId: string): Promise<void> =>
    {
        const room = await joinRoom(shortId);

        navigate(`/room/${room.id}`);
    };

    const handleOpenRoom = (roomId: string): void =>
    {
        navigate(`/room/${roomId}`);
    };

    if (loading)
    {
        return <div style={styles.center}>Загрузка...</div>;
    }

    if (!user)
    {
        return <div style={styles.center}>Нет пользователя</div>;
    }

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div style={styles.userInfo}>
                    <span style={styles.nickname}>{user.nickname}</span>
                    <span style={styles.email}>{user.email}</span>
                </div>
                <button onClick={() => setProfileOpen(true)} style={styles.profileButton}>
                    Профиль
                </button>
                <button onClick={handleLogout} style={styles.logout}>Выйти</button>
            </header>

            <main style={styles.main}>
                {rooms.length === 0 ? (
                    <div style={styles.empty}>
                        <p>Нет комнат</p>
                        <p style={styles.emptyHint}>Нажмите «+», чтобы создать или присоединиться</p>
                    </div>
                ) : (
                    <div style={styles.grid}>
                        {rooms.map((room) => (
                            <RoomCard
                                key={room.id}
                                room={room}
                                onClick={() => handleOpenRoom(room.id)}
                            />
                        ))}
                    </div>
                )}
            </main>

            <button
                onClick={() => setModalOpen(true)}
                style={styles.fab}
                aria-label="Создать или присоединиться"
            >
                +
            </button>

            <CreateOrJoinModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreate={handleCreate}
                onJoin={handleJoin}
            />

            <ProfileModal
                open={profileOpen}
                user={user}
                onClose={() => setProfileOpen(false)}
                onUpdate={(updated) => setUser(updated)}
            />
        </div>
    );
}

const styles = {
    container: {
        display: "flex",
        flexDirection: "column" as const,
        height: "100vh",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 2rem",
        borderBottom: "1px solid #2a2a2e",
    },
    userInfo: {
        display: "flex",
        flexDirection: "column" as const,
    },
    nickname: {
        fontSize: "1rem",
        fontWeight: 500,
    },
    email: {
        fontSize: "0.75rem",
        color: "#888",
    },
    logout: {
        color: "#3a7bd5",
        textDecoration: "underline",
    },
    profileButton: {
        color: "#3a7bd5",
        textDecoration: "underline",
        marginRight: "1rem",
    },
    main: {
        flex: 1,
        padding: "2rem",
        overflowY: "auto" as const,
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "1rem",
    },
    empty: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "#888",
        gap: "0.5rem",
    },
    emptyHint: {
        fontSize: "0.875rem",
    },
    fab: {
        position: "fixed" as const,
        bottom: "2rem",
        right: "2rem",
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        background: "#3a7bd5",
        color: "#fff",
        fontSize: "1.75rem",
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
    },
    center: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
    },
};

export default LobbyPage;
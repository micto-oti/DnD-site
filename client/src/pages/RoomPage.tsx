import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type {
    Asset,
    AssetFolder,
    RoomInitialState,
    RoomMemberWithUser,
    Scene,
    Marker,
    Drawing,
    Token,
} from "@gm-table/shared";

import { getAssets, getFolders } from "@/api/assets.js";
import { createScene as apiCreateScene } from "@/api/scenes.js";
import AssetPanel from "@/components/room/assets/AssetPanel.js";
import CreateCharacterModal from "@/components/room/modals/CreateCharacterModal.js";
import CharacterNotesModal from "@/components/room/notes/CharacterNotesModal.js";
import SceneCanvas from "@/components/room/scene/SceneCanvas.js";
import TextContextMenu from "@/components/room/scene/TextContextMenu.js";
import TokenContextMenu from "@/components/room/scene/TokenContextMenu.js";
import CreateSceneModal from "@/components/room/scenes/CreateSceneModal.js";
import SceneContextMenu from "@/components/room/scenes/SceneContextMenu.js";
import SceneEditModal from "@/components/room/scenes/SceneEditModal.js";
import SceneList from "@/components/room/scenes/SceneList.js";
import SidePanel from "@/components/room/sidebar/SidePanel.js";
import { useAssetStore } from "@/store/asset.store.js";
import { useDrawingStore } from "@/store/drawing.store.js";
import { useMarkerStore } from "@/store/marker.store.js";
import { useRoomStore } from "@/store/room.store.js";
import { useSceneStore } from "@/store/scene.store.js";
import { useUiStore } from "@/store/ui.store.js";
import { getSocket } from "@/ws/socket.js";
import { useSocket } from "@/ws/useSocket.js";

function RoomPage(): React.JSX.Element {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [createSceneOpen, setCreateSceneOpen] = useState(false);
    const [createCharacterOpen, setCreateCharacterOpen] = useState(false);

    const room = useRoomStore((s) => s.room);
    const members = useRoomStore((s) => s.members);
    const setInitialState = useRoomStore((s) => s.setInitialState);
    const addMember = useRoomStore((s) => s.addMember);
    const removeMember = useRoomStore((s) => s.removeMember);
    const setMemberOnline = useRoomStore((s) => s.setMemberOnline);
    const resetRoom = useRoomStore((s) => s.reset);

    const scenes = useSceneStore((s) => s.scenes);
    const activeSceneId = useSceneStore((s) => s.activeSceneId);
    const setScenes = useSceneStore((s) => s.setScenes);
    const setActiveSceneId = useSceneStore((s) => s.setActiveSceneId);
    const addScene = useSceneStore((s) => s.addScene);
    const removeScene = useSceneStore((s) => s.removeScene);
    const resetScenes = useSceneStore((s) => s.reset);

    const tokens = useRoomStore((s) => s.tokens);
    const setFolders = useAssetStore((s) => s.setFolders);
    const setAssets = useAssetStore((s) => s.setAssets);
    const addFolder = useAssetStore((s) => s.addFolder);
    const updateFolderInStore = useAssetStore((s) => s.updateFolder);
    const removeFolder = useAssetStore((s) => s.removeFolder);
    const addAsset = useAssetStore((s) => s.addAsset);
    const updateAssetInStore = useAssetStore((s) => s.updateAsset);
    const removeAsset = useAssetStore((s) => s.removeAsset);
    const resetAssets = useAssetStore((s) => s.reset);
    const addToken = useRoomStore((s) => s.addToken);
    const updateToken = useRoomStore((s) => s.updateToken);
    const moveToken = useRoomStore((s) => s.moveToken);
    const removeToken = useRoomStore((s) => s.removeToken);
    const [, setHoveredTokenId] = useState<string | null>(null);
    const setDrawings = useDrawingStore((s) => s.setDrawings);
    const addDrawing = useDrawingStore((s) => s.addDrawing);
    const removeDrawing = useDrawingStore((s) => s.removeDrawing);
    const clearOwnDrawings = useDrawingStore((s) => s.clearOwn);
    const clearAllDrawings = useDrawingStore((s) => s.clearAll);
    const resetDrawings = useDrawingStore((s) => s.reset);
    const updateDrawingInStore = useDrawingStore((s) => s.updateDrawing);
    const setMarkers = useMarkerStore((s) => s.setMarkers);
    const addMarker = useMarkerStore((s) => s.addMarker);
    const removeMarker = useMarkerStore((s) => s.removeMarker);
    const resetMarkers = useMarkerStore((s) => s.reset);

    const myUserId = localStorage.getItem("userId");
    const isGm = room !== null && myUserId !== null && room.gmId === myUserId;

    const [tokenMenu, setTokenMenu] = useState<{
        tokenId: string;
        x: number;
        y: number;
    } | null>(null);

    const [textMenu, setTextMenu] = useState<{
        drawing: Drawing;
        x: number;
        y: number;
    } | null>(null);

    const [sceneMenu, setSceneMenu] = useState<{
        scene: Scene;
        x: number;
        y: number;
    } | null>(null);

    const [editingScene, setEditingScene] = useState<Scene | null>(null);
    const [notesTokenId, setNotesTokenId] = useState<string | null>(null);

    useSocket();

    // Эмитим room:leave при закрытии/перезагрузке вкладки.
    // useEffect cleanup не срабатывает при beforeunload — нужен отдельный обработчик.
    useEffect(() => {
        const handleBeforeUnload = (): void => {
            const socket = getSocket();

            try {
                if (socket.connected) {
                    socket.emit("room:leave");
                }
            } catch {
                // сокет не подключён — ничего не делаем
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    useEffect(() => {
        if (!room) {
            return;
        }

        const myToken = tokens.find((t) => myUserId !== null && t.ownerId === myUserId && t.isMain);

        const fallbackColor = isGm ? "#00e5ff" : (myToken?.color ?? "#ffffff");

        useUiStore.getState().initColorIfEmpty(fallbackColor);
    }, [room, tokens, myUserId, isGm]);

    useEffect(() => {
        if (!id) {
            void navigate("/lobby");

            return;
        }

        const socket = getSocket();

        const handleState = (state: RoomInitialState): void => {
            setInitialState({
                room: state.room,
                members: state.members,
                turn: state.turn,
                tokens: state.tokens,
                drawings: state.drawings,
                markers: state.markers,
                statuses: state.statuses,
                assets: state.assets,
                assetFolders: state.assetFolders,
                messages: state.messages,
            });
            setScenes(state.scenes);
            setActiveSceneId(state.activeSceneId);
            setLoading(false);
            setDrawings(state.drawings);
            setMarkers(state.markers);

            if (state.needsMainToken) {
                setCreateCharacterOpen(true);
            }

            // Загружаем ассеты и папки отдельно (только для ГМ)
            const isGmNow = myUserId !== null && state.room.gmId === myUserId;

            if (isGmNow) {
                void Promise.all([getFolders(state.room.id), getAssets(state.room.id)])
                    .then(([folders, assets]) => {
                        setFolders(folders);
                        setAssets(assets);
                    })
                    .catch((err) => {
                        console.error("Failed to load:", err);
                    });
            }
        };

        const handleUserJoined = ({ member }: { member: RoomMemberWithUser }): void => {
            addMember(member);
        };

        const handleMemberOnlineChanged = ({
            userId,
            isOnline,
        }: {
            userId: string;
            isOnline: boolean;
        }): void => {
            setMemberOnline(userId, isOnline);
        };

        const handleUserLeft = ({ userId }: { userId: string }): void => {
            setMemberOnline(userId, false);
        };

        const handleSceneCreated = ({ scene }: { scene: Scene }): void => {
            addScene(scene);
        };

        const handleSceneDeleted = ({ sceneId }: { sceneId: string }): void => {
            removeScene(sceneId);
        };

        const handleSceneActivated = ({ sceneId }: { sceneId: string }): void => {
            setActiveSceneId(sceneId);
        };

        const handleTokenCreated = ({ token }: { token: Token }): void => {
            addToken(token);
        };

        const handleTokenUpdated = ({ token }: { token: Token }): void => {
            updateToken(token);
        };

        const handleTokenMoved = ({
            tokenId,
            x,
            y,
        }: {
            tokenId: string;
            x: number;
            y: number;
        }): void => {
            moveToken(tokenId, x, y);
        };

        const handleTokenDeleted = ({ tokenId }: { tokenId: string }): void => {
            removeToken(tokenId);
        };

        const handleTokensRecentered = ({ tokens: newTokens }: { tokens: Token[] }): void => {
            // Обновляем координаты всех токенов
            for (const t of newTokens) {
                moveToken(t.id, t.x, t.y);
            }
        };

        const handleFolderCreated = ({ folder }: { folder: AssetFolder }): void => {
            addFolder(folder);
        };

        const handleFolderUpdated = ({ folder }: { folder: AssetFolder }): void => {
            updateFolderInStore(folder);
        };

        const handleFolderDeleted = ({ folderId }: { folderId: string }): void => {
            removeFolder(folderId);
        };

        const handleAssetCreated = ({ asset }: { asset: Asset }): void => {
            addAsset(asset);
        };

        const handleAssetUpdated = ({ asset }: { asset: Asset }): void => {
            updateAssetInStore(asset);
        };

        const handleAssetDeleted = ({ assetId }: { assetId: string }): void => {
            removeAsset(assetId);
        };

        const handleDrawingCreated = ({ drawing }: { drawing: Drawing }): void => {
            addDrawing(drawing);
        };

        const handleDrawingDeleted = ({ drawingId }: { drawingId: string }): void => {
            removeDrawing(drawingId);
        };

        const handleDrawingExpired = ({ drawingId }: { drawingId: string }): void => {
            removeDrawing(drawingId);
        };

        const handleDrawingsCleared = ({
            authorId,
        }: {
            roomId: string;
            authorId: string | null;
        }): void => {
            if (authorId === null) {
                clearAllDrawings();
            } else {
                clearOwnDrawings(authorId);
            }
        };

        const handleDrawingUpdated = ({ drawing }: { drawing: Drawing }): void => {
            updateDrawingInStore(drawing);
        };

        const handleMarkerCreated = ({ marker }: { marker: Marker }): void => {
            addMarker(marker);
        };

        const handleMarkerDeleted = ({ markerId }: { markerId: string }): void => {
            removeMarker(markerId);
        };

        const handleMarkerExpired = ({ markerId }: { markerId: string }): void => {
            removeMarker(markerId);
        };

        const handleError = (err: { code: string; message: string }): void => {
            setError(err.message);
            setLoading(false);
        };

        socket.on("room:state", handleState);
        socket.on("room:user-joined", handleUserJoined);
        socket.on("room:user-left", handleUserLeft);
        socket.on("member:online-changed", handleMemberOnlineChanged);
        socket.on("scene:created", handleSceneCreated);
        socket.on("scene:deleted", handleSceneDeleted);
        socket.on("scene:activated", handleSceneActivated);
        socket.on("token:created", handleTokenCreated);
        socket.on("token:updated", handleTokenUpdated);
        socket.on("token:moved", handleTokenMoved);
        socket.on("token:deleted", handleTokenDeleted);
        socket.on("folder:created", handleFolderCreated);
        socket.on("folder:updated", handleFolderUpdated);
        socket.on("folder:deleted", handleFolderDeleted);
        socket.on("asset:created", handleAssetCreated);
        socket.on("asset:updated", handleAssetUpdated);
        socket.on("asset:deleted", handleAssetDeleted);
        socket.on("tokens:recentered", handleTokensRecentered);
        socket.on("drawing:created", handleDrawingCreated);
        socket.on("drawing:updated", handleDrawingUpdated);
        socket.on("drawing:deleted", handleDrawingDeleted);
        socket.on("drawing:expired", handleDrawingExpired);
        socket.on("drawings:cleared", handleDrawingsCleared);
        socket.on("marker:created", handleMarkerCreated);
        socket.on("marker:deleted", handleMarkerDeleted);
        socket.on("marker:expired", handleMarkerExpired);
        socket.on("error", handleError);

        socket.emit("room:join", { roomId: id });

        return () => {
            socket.off("room:state", handleState);
            socket.off("room:user-joined", handleUserJoined);
            socket.off("room:user-left", handleUserLeft);
            socket.off("member:online-changed", handleMemberOnlineChanged);
            socket.off("scene:created", handleSceneCreated);
            socket.off("scene:deleted", handleSceneDeleted);
            socket.off("scene:activated", handleSceneActivated);
            socket.off("token:created", handleTokenCreated);
            socket.off("token:updated", handleTokenUpdated);
            socket.off("token:moved", handleTokenMoved);
            socket.off("token:deleted", handleTokenDeleted);
            socket.off("folder:created", handleFolderCreated);
            socket.off("folder:updated", handleFolderUpdated);
            socket.off("folder:deleted", handleFolderDeleted);
            socket.off("asset:created", handleAssetCreated);
            socket.off("asset:updated", handleAssetUpdated);
            socket.off("asset:deleted", handleAssetDeleted);
            socket.off("tokens:recentered", handleTokensRecentered);
            socket.off("drawing:created", handleDrawingCreated);
            socket.off("drawing:updated", handleDrawingUpdated);
            socket.off("drawing:deleted", handleDrawingDeleted);
            socket.off("drawing:expired", handleDrawingExpired);
            socket.off("drawings:cleared", handleDrawingsCleared);
            socket.off("marker:created", handleMarkerCreated);
            socket.off("marker:deleted", handleMarkerDeleted);
            socket.off("marker:expired", handleMarkerExpired);
            socket.off("error", handleError);
            socket.emit("room:leave");
            resetRoom();
            resetScenes();
            resetAssets();
            resetMarkers();
        };
    }, [
        id,
        navigate,
        setInitialState,
        addMember,
        removeMember,
        setMemberOnline,
        setScenes,
        setActiveSceneId,
        addToken,
        updateToken,
        moveToken,
        removeToken,
        setFolders,
        setAssets,
        addFolder,
        updateFolderInStore,
        removeFolder,
        addAsset,
        updateAssetInStore,
        removeAsset,
        resetAssets,
        setDrawings,
        addDrawing,
        removeDrawing,
        clearOwnDrawings,
        clearAllDrawings,
        resetDrawings,
        updateDrawingInStore,
        setMarkers,
        addMarker,
        removeMarker,
        resetMarkers,
        addScene,
        removeScene,
        resetRoom,
        resetScenes,
        myUserId,
    ]);

    const handleCreateScene = async (name: string, backgroundUrl?: string): Promise<void> => {
        if (!id) {
            return;
        }

        await apiCreateScene(id, { name, backgroundUrl });
    };

    const handleActivateScene = (sceneId: string): void => {
        const socket = getSocket();

        socket.emit("scene:activate", { sceneId });
    };

    if (loading) {
        return <div style={styles.center}>Загрузка комнаты...</div>;
    }

    if (error) {
        return (
            <div style={styles.center}>
                <div>
                    <p style={styles.error}>{error}</p>
                    <button onClick={() => void navigate("/lobby")} style={styles.button}>
                        В lobby
                    </button>
                </div>
            </div>
        );
    }

    if (!room) {
        return <div style={styles.center}>Комната не загружена</div>;
    }

    const activeScene = scenes.find((s) => s.id === activeSceneId);

    const myToken = tokens.find((t) => myUserId !== null && t.ownerId === myUserId && t.isMain);
    const notesToken = notesTokenId
        ? (tokens.find((token) => token.id === notesTokenId) ?? null)
        : null;
    const notesOwnerName = notesToken?.ownerId
        ? members.find((member) => member.userId === notesToken.ownerId)?.user.nickname
        : undefined;
    const handleTokenMove = (tokenId: string, xPercent: number, yPercent: number): void => {
        // Оптимистичное обновление: сразу двигаем локально
        moveToken(tokenId, xPercent, yPercent);

        // Отправляем на сервер
        const socket = getSocket();

        socket.emit("token:move", {
            tokenId,
            x: xPercent,
            y: yPercent,
        });
    };

    const handleCreateCharacter = async (data: {
        name: string;
        color: string;
        imageUrl?: string;
        hpCurrent: number;
        hpMax: number;
        spCurrent: number;
        spMax: number;
        level: number;
        experience: number;
    }): Promise<void> => {
        if (!id) {
            return;
        }

        const socket = getSocket();

        socket.emit("token:create", {
            roomId: id,
            name: data.name,
            color: data.color,
            imageUrl: data.imageUrl,
            isMain: true,
            ownerId: myUserId,
            hpCurrent: data.hpCurrent,
            hpMax: data.hpMax,
            spCurrent: data.spCurrent,
            spMax: data.spMax,
            level: data.level,
            experience: data.experience,
        });

        setCreateCharacterOpen(false);
    };

    const handleAssetDrop = (assetId: string, xPercent: number, yPercent: number): void => {
        if (!id) {
            return;
        }

        const socket = getSocket();

        socket.emit("token:create", {
            roomId: id,
            assetId,
            x: xPercent,
            y: yPercent,
        });
    };

    const handleRecenterAll = (): void => {
        if (!id) {
            return;
        }

        const socket = getSocket();

        socket.emit("tokens:recenter-all", { roomId: id });
    };

    const handleRecenterMine = (): void => {
        if (!id) {
            return;
        }

        const socket = getSocket();

        socket.emit("tokens:recenter-mine", { roomId: id });
    };

    const handleTokenContextMenu = (tokenId: string, x: number, y: number): void => {
        setTokenMenu({ tokenId, x, y });
    };

    const handleTextContextMenu = (drawing: Drawing, x: number, y: number): void => {
        setTextMenu({ drawing, x, y });
    };

    const handleSceneContextMenu = (scene: Scene, x: number, y: number): void => {
        setSceneMenu({ scene, x, y });
    };

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <div>
                    <div style={styles.roomName}>{room.name}</div>
                    <div style={styles.roomId}>ID: {room.shortId}</div>
                </div>
                <div style={styles.headerActions}>
                    {isGm ? (
                        <button
                            onClick={handleRecenterAll}
                            style={styles.headerButton}
                            title="Вернуть всех в центр"
                        >
                            ⛶ Вернуть всех
                        </button>
                    ) : (
                        <button
                            onClick={handleRecenterMine}
                            style={styles.headerButton}
                            title="Вернуть мой токен"
                        >
                            ⛶ Вернуть мой токен
                        </button>
                    )}
                </div>
            </header>

            <SceneList
                scenes={scenes}
                activeSceneId={activeSceneId}
                isGm={isGm}
                onActivate={handleActivateScene}
                onCreateClick={() => setCreateSceneOpen(true)}
                onContextMenu={handleSceneContextMenu}
            />

            <div style={styles.body}>
                <main style={styles.main}>
                    {activeScene ? (
                        <SceneCanvas
                            roomId={room.id}
                            backgroundUrl={activeScene.backgroundUrl}
                            tokens={tokens}
                            myUserId={myUserId}
                            isGm={isGm}
                            onTokenHover={setHoveredTokenId}
                            onTokenMove={handleTokenMove}
                            onAssetDrop={handleAssetDrop}
                            onTokenContextMenu={handleTokenContextMenu}
                            pingColor={isGm ? "#00e5ff" : (myToken?.color ?? "#ffffff")}
                            onTextContextMenu={handleTextContextMenu}
                        />
                    ) : (
                        <div style={styles.centerColumn}>
                            <p>Нет активной сцены</p>
                            {isGm && (
                                <button
                                    onClick={() => setCreateSceneOpen(true)}
                                    style={styles.button}
                                >
                                    Создать сцену
                                </button>
                            )}
                        </div>
                    )}
                </main>
                <SidePanel />
            </div>

            {tokenMenu &&
                (() => {
                    const token = tokens.find((t) => t.id === tokenMenu.tokenId);

                    if (!token) {
                        return null;
                    }

                    const canEdit = isGm || (myUserId !== null && token.ownerId === myUserId);
                    const canTakeNotes =
                        myUserId !== null && token.ownerId !== null && token.ownerId !== myUserId;

                    return (
                        <TokenContextMenu
                            token={token}
                            position={{ x: tokenMenu.x, y: tokenMenu.y }}
                            canEdit={canEdit}
                            isGm={isGm}
                            onOpenNotes={canTakeNotes ? () => setNotesTokenId(token.id) : undefined}
                            onClose={() => setTokenMenu(null)}
                        />
                    );
                })()}

            {textMenu && (
                <TextContextMenu
                    drawing={textMenu.drawing}
                    position={{ x: textMenu.x, y: textMenu.y }}
                    onClose={() => setTextMenu(null)}
                />
            )}

            {isGm && <AssetPanel roomId={room.id} />}

            {sceneMenu && (
                <SceneContextMenu
                    scene={sceneMenu.scene}
                    position={{ x: sceneMenu.x, y: sceneMenu.y }}
                    onClose={() => setSceneMenu(null)}
                    onEdit={() => setEditingScene(sceneMenu.scene)}
                />
            )}

            <CreateSceneModal
                open={createSceneOpen}
                onClose={() => setCreateSceneOpen(false)}
                onCreate={handleCreateScene}
            />

            <SceneEditModal
                open={editingScene !== null}
                scene={editingScene}
                onClose={() => setEditingScene(null)}
            />

            <CreateCharacterModal
                open={createCharacterOpen}
                onClose={() => setCreateCharacterOpen(false)}
                onCreate={handleCreateCharacter}
            />

            <CharacterNotesModal
                open={notesToken !== null}
                token={notesToken}
                ownerName={notesOwnerName}
                onClose={() => setNotesTokenId(null)}
            />
        </div>
    );
}

const styles = {
    container: {
        display: "flex",
        flexDirection: "column" as const,
        height: "100%",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.75rem 1.5rem",
        borderBottom: "1px solid #2a2a2e",
    },
    roomName: {
        fontSize: "1.125rem",
        fontWeight: 500,
    },
    roomId: {
        fontSize: "0.75rem",
        color: "#888",
        fontFamily: "monospace",
    },
    headerActions: {
        display: "flex",
        gap: "0.5rem",
    },
    headerButton: {
        padding: "0.375rem 0.75rem",
        background: "#2a2a2e",
        border: "1px solid #3a3a3e",
        borderRadius: "4px",
        fontSize: "0.8125rem",
        color: "#e8e8e8",
        cursor: "pointer",
        whiteSpace: "nowrap" as const,
    },
    body: {
        flex: 1,
        display: "flex",
        overflow: "hidden" as const,
    },
    main: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "5px",
        overflow: "hidden" as const,
    },
    sceneWrapper: {
        position: "relative" as const,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    sceneImage: {
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit: "contain" as const,
    },
    scenePlaceholder: {
        color: "#888",
        textAlign: "center" as const,
    },
    hint: {
        fontSize: "0.875rem",
        marginTop: "0.5rem",
    },
    center: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
    },
    centerColumn: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
    },
    error: {
        color: "#e74c3c",
        marginBottom: "1rem",
    },
    button: {
        padding: "0.5rem 1rem",
        background: "#3a7bd5",
        color: "#fff",
        borderRadius: "4px",
    },
};

export default RoomPage;

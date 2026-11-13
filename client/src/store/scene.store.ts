import { create } from "zustand";

import type { Scene } from "@gm-table/shared";

interface SceneStore
{
    scenes: Scene[];
    activeSceneId: string | null;

    setScenes: (scenes: Scene[]) => void;
    setActiveSceneId: (sceneId: string | null) => void;

    addScene: (scene: Scene) => void;
    updateScene: (scene: Scene) => void;
    removeScene: (sceneId: string) => void;

    reset: () => void;
}

const initialState = {
    scenes: [] as Scene[],
    activeSceneId: null as string | null,
};

export const useSceneStore = create<SceneStore>((set) => ({
    ...initialState,

    setScenes: (scenes) => set({ scenes }),

    setActiveSceneId: (activeSceneId) => set({ activeSceneId }),

    addScene: (scene) =>
        set((s) => ({
            scenes: [...s.scenes, scene].sort((a, b) => a.orderIndex - b.orderIndex),
        })),

    updateScene: (scene) =>
        set((s) => ({
            scenes: s.scenes
                .map((item) => (item.id === scene.id ? scene : item))
                .sort((a, b) => a.orderIndex - b.orderIndex),
        })),

    removeScene: (sceneId) =>
        set((s) => ({
            scenes: s.scenes.filter((item) => item.id !== sceneId),
            activeSceneId: s.activeSceneId === sceneId ? null : s.activeSceneId,
        })),

    reset: () => set(initialState),
}));
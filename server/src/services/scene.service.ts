import { prisma } from "@/db/prisma.js";
import type { CreateSceneInput, Scene, UpdateSceneInput } from "@gm-table/shared";

/**
 * Создаёт сцену в комнате.
 * Права проверяются в роуте.
 */
export async function createScene(
    roomId: string,
    input: CreateSceneInput,
): Promise<Scene>
{
    const maxOrder = await prisma.scene.aggregate({
        where: { roomId },
        _max: { orderIndex: true },
    });

    const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

    const scene = await prisma.scene.create({
        data: {
            roomId,
            name: input.name,
            backgroundUrl: input.backgroundUrl ?? null,
            orderIndex,
        },
    });

    return toSceneDto(scene);
}

/**
 * Обновляет сцену.
 */
export async function updateScene(
    sceneId: string,
    input: UpdateSceneInput,
): Promise<Scene>
{
    const data: Record<string, unknown> = {};

    if (input.name !== undefined)
    {
        data.name = input.name;
    }

    if (input.backgroundUrl !== undefined)
    {
        data.backgroundUrl = input.backgroundUrl;
    }

    if (input.orderIndex !== undefined)
    {
        data.orderIndex = input.orderIndex;
    }

    const scene = await prisma.scene.update({
        where: { id: sceneId },
        data,
    });

    return toSceneDto(scene);
}

/**
 * Удаляет сцену.
 * Если она была активной — сбрасывает activeSceneId.
 */
export async function deleteScene(sceneId: string): Promise<void>
{
    const scene = await prisma.scene.findUnique({
        where: { id: sceneId },
    });

    if (!scene)
    {
        throw new SceneError("SCENE_NOT_FOUND", "Сцена не найдена");
    }

    await prisma.$transaction(async (tx) =>
    {
        await tx.roomState.updateMany({
            where: { activeSceneId: sceneId },
            data: { activeSceneId: null },
        });

        await tx.scene.delete({ where: { id: sceneId } });
    });
}

/**
 * Сцены комнаты, упорядоченные по orderIndex.
 */
export async function getScenesByRoom(roomId: string): Promise<Scene[]>
{
    const scenes = await prisma.scene.findMany({
        where: { roomId },
        orderBy: { orderIndex: "asc" },
    });

    return scenes.map(toSceneDto);
}

/**
 * Делает сцену активной в комнате.
 */
export async function activateScene(
    roomId: string,
    sceneId: string,
): Promise<Scene>
{
    const scene = await prisma.scene.findUnique({
        where: { id: sceneId },
    });

    if (!scene || scene.roomId !== roomId)
    {
        throw new SceneError("SCENE_NOT_FOUND", "Сцена не найдена в этой комнате");
    }

    await prisma.roomState.update({
        where: { roomId },
        data: { activeSceneId: sceneId },
    });

    return toSceneDto(scene);
}

export class SceneError extends Error
{
    constructor(
        public code: string,
        message: string,
    )
    {
        super(message);
        this.name = "SceneError";
    }
}

function toSceneDto(scene: {
    id: string;
    roomId: string;
    name: string;
    backgroundUrl: string | null;
    orderIndex: number;
    createdAt: Date;
}): Scene
{
    return {
        id: scene.id,
        roomId: scene.roomId,
        name: scene.name,
        backgroundUrl: scene.backgroundUrl,
        orderIndex: scene.orderIndex,
        createdAt: scene.createdAt.toISOString(),
    };
}
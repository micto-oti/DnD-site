import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import jwt from "@fastify/jwt";
import type { PrismaClient } from "@prisma/client";

test("status library authorization, validation, room scoping and events", async () => {
    const records = new Map<string, Record<string, unknown>>();
    const emitted: string[] = [];
    const fake = {
        roomMember: { findUnique: async ({ where }: { where: { roomId_userId: { roomId: string; userId: string } } }) => {
            const { roomId, userId } = where.roomId_userId;
            return roomId === "room-a" ? { role: userId === "gm" ? "gm" : "player" } : null;
        } },
        statusDefinition: {
            create: async ({ data }: { data: Record<string, unknown> }) => {
                const row = { ...data, createdAt: new Date() };
                records.set(String(data.id), row);
                return row;
            },
            findUnique: async ({ where }: { where: { roomId_id: { id: string; roomId: string } } }) => {
                const row = records.get(where.roomId_id.id);
                return row?.roomId === where.roomId_id.roomId ? row : null;
            },
            update: async ({ where, data }: { where: { roomId_id: { id: string } }; data: Record<string, unknown> }) => {
                const row = { ...records.get(where.roomId_id.id), ...data };
                records.set(where.roomId_id.id, row);
                return row;
            },
        },
    };
    // Install a fake before importing the routes: no database connection is made.
    (globalThis as unknown as { prisma: PrismaClient }).prisma = fake as unknown as PrismaClient;
    const { registerStatusRoutes } = await import("../src/api/statuses.routes.js");
    const app = Fastify();
    await app.register(jwt, { secret: "status-library-test-secret-not-for-production" });
    app.decorate("io", { to: (room: string) => ({ emit: (event: string) => emitted.push(`${room}:${event}`) }) });
    await registerStatusRoutes(app);
    const url = "/api/rooms/room-a/statuses";
    const payload = { name: " Горение ", icon: "🔥", color: "#ff8800", hasCount: true };
    const headers = (sub: string) => ({ authorization: `Bearer ${app.jwt.sign({ sub })}` });
    try {
        assert.equal((await app.inject({ method: "POST", url, payload })).statusCode, 401);
        assert.equal((await app.inject({ method: "POST", url, payload, headers: headers("player") })).statusCode, 403);
        assert.equal((await app.inject({ method: "POST", url: "/api/rooms/foreign/statuses", payload, headers: headers("gm") })).statusCode, 403);
        assert.equal((await app.inject({ method: "POST", url, payload: { ...payload, name: " " }, headers: headers("gm") })).statusCode, 400);
        assert.equal(records.size, 0);
        const created = await app.inject({ method: "POST", url, payload, headers: headers("gm") });
        assert.equal(created.statusCode, 201);
        const status = created.json();
        assert.equal(status.name, "Горение");
        assert.equal(status.roomId, "room-a");
        assert.equal(status.maxCount, 99);
        assert.equal(status.createdBy, "gm");
        const edit = { name: "Пламя", icon: "🔥", color: "#ee7700" };
        const editUrl = `${url}/${status.id}`;
        assert.equal((await app.inject({ method: "PATCH", url: editUrl, payload: edit, headers: headers("player") })).statusCode, 403);
        assert.equal((await app.inject({ method: "PATCH", url: editUrl, payload: { ...edit, hasCount: false }, headers: headers("gm") })).statusCode, 400);
        const updated = await app.inject({ method: "PATCH", url: editUrl, payload: edit, headers: headers("gm") });
        assert.equal(updated.statusCode, 200);
        assert.equal(updated.json().hasCount, true);
        assert.equal(updated.json().name, "Пламя");
        assert.equal((await app.inject({ method: "PATCH", url: `${url}/missing`, payload: edit, headers: headers("gm") })).statusCode, 404);
        const noCount = await app.inject({ method: "POST", url, payload: { ...payload, hasCount: false }, headers: headers("gm") });
        assert.equal(noCount.json().maxCount, null);
        assert.deepEqual(emitted, ["room:room-a:status:created", "room:room-a:status:updated", "room:room-a:status:created"]);
    } finally { await app.close(); }
});

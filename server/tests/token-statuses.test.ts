import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import jwt from "@fastify/jwt";
import type { PrismaClient } from "@prisma/client";
import type { TokenStatus } from "@gm-table/shared";
import { changeStatuses } from "../src/services/token-status.service.js";

const burn = { id: "burn", hasCount: true, maxStacks: 999, maxCount: 99 };
test("first application, repeat, zero, limits and removal", () => {
    const added = changeStatuses([], burn, "add");
    assert.deepEqual(added, [{ id: "burn", stacks: 1, count: 1 }]);
    assert.deepEqual(changeStatuses(added, burn, "add"), added);
    const zero = changeStatuses(added, burn, "update", { stacks: 0, count: 0 });
    assert.deepEqual(zero, [{ id: "burn", stacks: 0, count: 0 }]);
    assert.deepEqual(changeStatuses(zero, burn, "add"), zero);
    assert.deepEqual(changeStatuses(zero, burn, "remove"), []);
    assert.throws(() => changeStatuses([], burn, "update", { stacks: 1, count: 1 }));
    for (const values of [{ stacks: -1, count: 1 }, { stacks: 1.5, count: 1 }, { stacks: 1000, count: 1 }, { stacks: 1, count: 100 }, { stacks: 1, count: null }]) assert.throws(() => changeStatuses(added, burn, "update", values));
    const noCount = { ...burn, hasCount: false, maxCount: null };
    assert.deepEqual(changeStatuses([], noCount, "add"), [{ id: "burn", stacks: 1, count: null }]);
    assert.throws(() => changeStatuses(added, noCount, "update", { stacks: 1, count: 1 }));
});

test("API checks ownership, membership, room library, retries concurrent edits and broadcasts", async () => {
    let statuses: TokenStatus[] = [];
    let collision = false;
    let alwaysConflict = false;
    let writes = 0;
    const emitted: string[] = [];
    const snapshot = () => ({ id: "token", roomId: "room", ownerId: "owner", statuses: structuredClone(statuses), createdAt: new Date(), updatedAt: new Date() });
    const fake = {
        token: {
            findUnique: async ({ where }: { where: { id: string } }) => where.id === "token" ? snapshot() : null,
            updateMany: async ({ where, data }: { where: { statuses: { equals: TokenStatus[] } }; data: { statuses: TokenStatus[] } }) => {
                if (alwaysConflict) return { count: 0 };
                if (collision) { collision = false; statuses.push({ id: "other", stacks: 2, count: null }); return { count: 0 }; }
                if (JSON.stringify(where.statuses.equals) !== JSON.stringify(statuses)) return { count: 0 };
                statuses = structuredClone(data.statuses); writes++;
                return { count: 1 };
            },
        },
        roomMember: { findUnique: async ({ where }: { where: { roomId_userId: { roomId: string; userId: string } } }) => {
            assert.equal(where.roomId_userId.roomId, "room");
            const userId = where.roomId_userId.userId;
            return userId === "outsider" ? null : { role: userId === "gm" ? "gm" : "player" };
        } },
        statusDefinition: { findUnique: async ({ where }: { where: { roomId_id: { roomId: string; id: string } } }) => {
            assert.equal(where.roomId_id.roomId, "room");
            return where.roomId_id.id === "burn" ? burn : null;
        } },
    };
    (globalThis as unknown as { prisma: PrismaClient }).prisma = fake as unknown as PrismaClient;
    const { registerTokenStatusRoutes } = await import("../src/api/token-statuses.routes.js");
    const app = Fastify();
    await app.register(jwt, { secret: "token-status-test-secret-not-for-production" });
    app.decorate("io", { to: (room: string) => ({ emit: (event: string) => emitted.push(`${room}:${event}`) }) });
    await registerTokenStatusRoutes(app);
    const url = "/api/tokens/token/statuses/burn";
    const headers = (sub: string) => ({ authorization: `Bearer ${app.jwt.sign({ sub })}` });
    try {
        assert.equal((await app.inject({ method: "POST", url })).statusCode, 401);
        for (const method of ["POST", "PATCH", "DELETE"] as const) {
            for (const user of ["other-player", "outsider"]) {
                assert.equal((await app.inject({ method, url, headers: headers(user), ...(method === "PATCH" ? { payload: { stacks: 2, count: 2 } } : {}) })).statusCode, 403);
            }
        }
        assert.equal(writes, 0);
        assert.equal((await app.inject({ method: "POST", url: "/api/tokens/token/statuses/foreign", headers: headers("owner") })).statusCode, 404);
        assert.equal((await app.inject({ method: "POST", url: "/api/tokens/missing/statuses/burn", headers: headers("owner") })).statusCode, 404);
        collision = true;
        const add = await app.inject({ method: "POST", url, headers: headers("owner") });
        assert.equal(add.statusCode, 200);
        assert.deepEqual(add.json().statuses, [{ id: "other", stacks: 2, count: null }, { id: "burn", stacks: 1, count: 1 }]);
        const zero = await app.inject({ method: "PATCH", url, headers: headers("owner"), payload: { stacks: 0, count: 0 } });
        assert.equal(zero.statusCode, 200);
        const repeat = await app.inject({ method: "POST", url, headers: headers("owner") });
        assert.deepEqual(repeat.json().statuses, zero.json().statuses);
        assert.equal((await app.inject({ method: "PATCH", url, headers: headers("owner"), payload: { stacks: 1, count: 100 } })).statusCode, 400);
        assert.equal((await app.inject({ method: "PATCH", url, headers: headers("owner"), payload: { stacks: 1, count: 1, ownerId: "owner" } })).statusCode, 400);
        assert.equal((await app.inject({ method: "DELETE", url, headers: headers("gm") })).statusCode, 200);
        assert.deepEqual(statuses, [{ id: "other", stacks: 2, count: null }]);
        alwaysConflict = true;
        assert.equal((await app.inject({ method: "POST", url, headers: headers("owner") })).statusCode, 409);
        assert.equal(emitted.length, 4);
        assert.ok(emitted.every((event) => event === "room:room:token:updated"));
    } finally { await app.close(); }
});

import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dockerApiTarget = process.env.DOCKER_API_TARGET;

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: Number(process.env.CLIENT_PORT ?? 40310),
        host: true,
        // Container-only proxy: the browser uses the same origin for all requests.
        ...(dockerApiTarget ? {
            proxy: {
                "/api": { target: dockerApiTarget, changeOrigin: true },
                "/uploads": { target: dockerApiTarget, changeOrigin: true },
                "/socket.io": { target: dockerApiTarget, changeOrigin: true, ws: true },
            },
        } : {}),
    },
});
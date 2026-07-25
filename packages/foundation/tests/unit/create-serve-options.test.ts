/**
 * createServeOptions — development HMR + HTML routes coexistence.
 *
 * @packageDocumentation
 */

import { describe, expect, test } from "bun:test";
import { Container } from "@ninots/container";
import type { Router } from "@ninots/routing";
import { createApp } from "../../src/create-app";
import { ROUTER_KEY } from "../../src/core-keys";
import { createServeOptions } from "../../src/create-serve-options";
import hmrDemo from "../fixtures/hmr-demo/hmr-demo.html";

describe("createServeOptions() development + routes", () => {
    test("defaults development from app config", () => {
        const app = createApp({ port: 0, development: true }, new Container());
        const options = createServeOptions(app);

        expect(options.development).toBe(true);
    });

    test("override can disable development even when app is in development", () => {
        const app = createApp({ port: 0, development: true }, new Container());
        const options = createServeOptions(app, { development: false });

        expect(options.development).toBe(false);
    });

    test("HTML routes coexist with Router fetch (dedicated path)", async () => {
        const container = new Container();
        const app = createApp({ port: 0, hostname: "127.0.0.1", development: true }, container);
        const router = app.make<Router>(ROUTER_KEY);
        router.get("/api/ping", () => Response.json({ ok: true }));

        const options = createServeOptions(app, {
            routes: {
                "/hmr-demo": hmrDemo,
            },
        });

        expect(options.development).toBe(true);
        expect(options.routes).toBeDefined();

        const server = Bun.serve(options);
        try {
            const api = await fetch(`http://127.0.0.1:${server.port}/api/ping`);
            expect(api.status).toBe(200);
            expect(await api.json()).toEqual({ ok: true });

            const page = await fetch(`http://127.0.0.1:${server.port}/hmr-demo`);
            expect(page.status).toBe(200);
            const body = await page.text();
            expect(body).toContain("hmr-label");
            expect(body.toLowerCase()).toContain("<!doctype html>");
        } finally {
            server.stop(true);
        }
    });
});

import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

describe("database readiness", () => {
  it("keeps liveness independent of database availability", async () => {
    const app = createApp({ readinessCheck: async () => { throw new Error("sensitive database details"); } });
    const health = await request(app).get("/health");
    const ready = await request(app).get("/ready");
    expect(health.status).toBe(200);
    expect(ready.status).toBe(503);
    expect(ready.body).toEqual({ status: "unavailable" });
    expect(JSON.stringify(ready.body)).not.toContain("sensitive");
  });

  it("reports ready only when the database check succeeds", async () => {
    const app = createApp({ readinessCheck: async () => {} });
    const ready = await request(app).get("/ready");
    expect(ready.status).toBe(200);
    expect(ready.body).toEqual({ status: "ready" });
  });
});

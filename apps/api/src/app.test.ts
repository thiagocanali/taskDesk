import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

describe("API foundation", () => {
  const app = createApp();

  it("returns a healthy status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      service: "taskdesk-api",
    });
    expect(response.body.timestamp).toBeTypeOf("string");
  });

  it("exposes the initial API version", async () => {
    const response = await request(app).get("/api/v1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      name: "taskDesk API",
      version: "v1",
      status: "available",
    });
  });
});

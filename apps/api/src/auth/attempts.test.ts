import type { PrismaClient } from "@prisma/client";
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { accountAttemptKey } from "./attempts.js";
import { createAuthRouter } from "./routes.js";

describe("shared authentication budgets", () => {
 it("normalizes the same account without retaining its email in the key", () => {
  const key=accountAttemptKey(" User@Example.test ");
  expect(key).toBe(accountAttemptKey("user@example.test"));
  expect(key).toBe(accountAttemptKey(" ".repeat(1000)+"user@example.test"));
  expect(key).toMatch(/^[a-f0-9]{64}$/);
  expect(key).not.toBe(accountAttemptKey("other@example.test"));
  expect(accountAttemptKey(undefined)).toBeNull();
  expect(accountAttemptKey("a".repeat(1000))).toBeNull();
  expect(accountAttemptKey("invalid")).toBeNull();
 });
 it("returns a retry budget before touching credentials", async () => {
  const findUnique=vi.fn();
  const prisma={authUser:{findUnique},$queryRaw:vi.fn().mockResolvedValue([{allowed:false,retryAfter:123}])} as unknown as PrismaClient;
  const app=express().use(express.json()).use(createAuthRouter(prisma));
  const result=await request(app).post("/login").send({email:"user@example.test",password:"long-example-password"});
  expect(result.status).toBe(429);
  expect(result.headers["retry-after"]).toBe("123");
  expect(findUnique).not.toHaveBeenCalled();
 });
 it("fails closed on store errors while keeping logout and identity reads independent", async () => {
  const query=vi.fn().mockRejectedValue(new Error("private database detail"));
  const findUnique=vi.fn();
  const prisma={authUser:{findUnique},$queryRaw:query} as unknown as PrismaClient;
  const app=express().use(express.json()).use(createAuthRouter(prisma));
  const result=await request(app).post("/login").send({email:"user@example.test",password:"long-example-password"});
  expect(result.status).toBe(503);
  expect(result.text).not.toContain("private database detail");
  expect(findUnique).not.toHaveBeenCalled();
  expect((await request(app).post("/logout")).status).toBe(204);
  expect((await request(app).get("/me")).status).toBe(401);
  expect(query).toHaveBeenCalledOnce();
 });
 it("does not spend shared budgets on disabled registration", async () => {
  const query=vi.fn();
  const prisma={$queryRaw:query} as unknown as PrismaClient;
  const app=express().use(express.json()).use(createAuthRouter(prisma,{allowRegistration:false}));
  expect((await request(app).post("/register").send({email:"user@example.test"})).status).toBe(403);
  expect(query).not.toHaveBeenCalled();
 });
});

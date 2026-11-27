import express from "express";
import type { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuthRouter } from "./routes.js";

describe("registration policy", () => {
 afterEach(() => vi.unstubAllEnvs());
 it.each([undefined,"false","TRUE","1"])("denies registration unless explicitly enabled (%s)",async value => {
  vi.stubEnv("AUTH_ALLOW_REGISTRATION",value);
  const create = vi.fn();
  const prisma = {authUser:{create},$queryRaw:vi.fn().mockResolvedValue([{allowed:true,retryAfter:900}])} as unknown as PrismaClient;
  const app = express().use(express.json()).use(createAuthRouter(prisma));
  const response = await request(app).post("/register").send({email:"user@example.test",password:"long-example-password"});
  expect(response.status).toBe(403);
  expect(create).not.toHaveBeenCalled();
 });
 it("limits repeated disabled registration attempts without touching the database",async () => {
  const create = vi.fn();
  const prisma = {authUser:{create}} as unknown as PrismaClient;
  const app = express().use(express.json()).use(createAuthRouter(prisma,{allowRegistration:false}));
  for (let attempt=0;attempt<10;attempt++) {
   const response=await request(app).post("/register").send({email:"user@example.test",password:"long-example-password"});
   expect(response.status).toBe(403);
  }
  const limited=await request(app).post("/register").send({email:"user@example.test",password:"long-example-password"});
  expect(limited.status).toBe(429);
  expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
  expect(create).not.toHaveBeenCalled();
 });
 it("allows registration only after the operator opts in",async () => {
  vi.stubEnv("AUTH_ALLOW_REGISTRATION","true");
  const create = vi.fn().mockResolvedValue({id:"u1",email:"user@example.test"});
  const prisma = {authUser:{create},$queryRaw:vi.fn().mockResolvedValue([{allowed:true,retryAfter:900}])} as unknown as PrismaClient;
  const app = express().use(express.json()).use(createAuthRouter(prisma));
  const response = await request(app).post("/register").send({email:"user@example.test",password:"long-example-password"});
  expect(response.status).toBe(201);
  expect(create).toHaveBeenCalledOnce();
  expect(response.body.data).not.toHaveProperty("passwordHash");
 });
});

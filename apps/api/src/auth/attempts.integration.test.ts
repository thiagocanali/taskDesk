import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createPrismaClient } from "../database/prisma.js";
import { accountAttemptKey, consumeAccountAttempt } from "./attempts.js";
import { createAuthRouter } from "./routes.js";

describe.skipIf(!process.env.TEST_DATABASE_URL)("PostgreSQL authentication budgets", () => {
 const first=createPrismaClient(process.env.TEST_DATABASE_URL ?? "postgresql://localhost/unused");
 const second=createPrismaClient(process.env.TEST_DATABASE_URL ?? "postgresql://localhost/unused");
 const keys:string[]=[];
 function account() {
  const email=`budget-${randomUUID()}@example.test`;
  const key=accountAttemptKey(email)!;keys.push(key);return {email,key};
 }
 afterAll(async () => {
  await first.authAttempt.deleteMany({where:{key:{in:keys}}});
  await Promise.all([first.$disconnect(),second.$disconnect()]);
 });
 it("enables row-level security on the shared budget table",async()=>{
  const rows=await first.$queryRaw<{enabled:boolean}[]>`SELECT relrowsecurity AS enabled FROM pg_class WHERE oid='public."AuthAttempt"'::regclass`;
  expect(rows).toEqual([{enabled:true}]);
 });
 it("allows exactly ten concurrent attempts across independent connections", async () => {
  const {key}=account();
  const results=await Promise.all(Array.from({length:24},(_,i)=>consumeAccountAttempt(i%2?first:second,key)));
  expect(results.filter(r=>r.allowed)).toHaveLength(10);
  expect(results.filter(r=>!r.allowed)).toHaveLength(14);
  expect(results.every(r=>r.retryAfter>0 && r.retryAfter<=900)).toBe(true);
  expect((await first.authAttempt.findUniqueOrThrow({where:{key}})).attempts).toBe(11);
 });
 it("resets an expired window and keeps other accounts independent", async () => {
  const {key}=account();const other=account();
  await first.authAttempt.create({data:{key,attempts:11,expiresAt:new Date(0)}});
  expect((await consumeAccountAttempt(second,key)).allowed).toBe(true);
  expect((await first.authAttempt.findUniqueOrThrow({where:{key}})).attempts).toBe(1);
  expect((await consumeAccountAttempt(first,other.key)).allowed).toBe(true);
 });
 it("shares the budget across routers despite spoofed forwarding headers", async () => {
  const {email,key}=account();
  for(let i=0;i<10;i++) await consumeAccountAttempt(first,key);
  const app=express().use(express.json()).use(createAuthRouter(second));
  const response=await request(app).post("/login").set("X-Forwarded-For","203.0.113.1").send({email:` ${email.toUpperCase()} `,password:"long-example-password"});
  expect(response.status).toBe(429);
  expect(Number(response.headers["retry-after"])).toBeGreaterThan(0);
  expect((await request(app).post("/logout")).status).toBe(204);
 });
});

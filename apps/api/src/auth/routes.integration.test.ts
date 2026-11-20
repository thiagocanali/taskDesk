import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "../database/prisma.js";
import { createAuthRouter } from "./routes.js";

describe.skipIf(!process.env.TEST_DATABASE_URL)("auth HTTP routes",()=>{
 const prisma=createPrismaClient(process.env.TEST_DATABASE_URL ?? "postgresql://localhost/unused");
 const ids:string[]=[];
 const app=express();
 app.use(express.json());
 app.use("/api/v1/auth",createAuthRouter(prisma,{allowRegistration:true}));
 afterAll(async()=>{await prisma.authUser.deleteMany({where:{id:{in:ids}}});await prisma.$disconnect();});
 it("registers, logs in, verifies identity and revokes session",async()=>{
  const email=`api-${randomUUID()}@example.test`;
  const password="a-secure-example-password";
  const created=await request(app).post("/api/v1/auth/register").send({email,password});
  expect(created.status).toBe(201);
  expect(created.body.data).toMatchObject({email});
  expect(created.body.data).not.toHaveProperty("passwordHash");
  ids.push(created.body.data.id);
  expect((await request(app).post("/api/v1/auth/register").send({email,password})).status).toBe(409);
  expect((await request(app).post("/api/v1/auth/login").send({email,password:"incorrect-but-long-password"})).status).toBe(401);
  const login=await request(app).post("/api/v1/auth/login").send({email,password});
  expect(login.status).toBe(200);
  const token=login.body.data.token as string;
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  expect((await request(app).get("/api/v1/auth/me")).status).toBe(401);
  const me=await request(app).get("/api/v1/auth/me").set("Authorization",`Bearer ${token}`);
  expect(me.status).toBe(200);
  expect(me.body.data.email).toBe(email);
  // Logout is idempotent and never consumes the login/register rate-limit budget.
  for (let attempt=0;attempt<12;attempt++) {
   expect((await request(app).post("/api/v1/auth/logout").set("Authorization",`Bearer ${token}`)).status).toBe(204);
  }
  expect((await request(app).get("/api/v1/auth/me").set("Authorization",`Bearer ${token}`)).status).toBe(401);
 });
});

import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "../database/prisma.js";
import { createApp } from "../app.js";
import { createAuthenticator } from "./authentication.js";
import { createSession, revokeSession } from "./sessions.js";
import { PrismaTaskRepository } from "../tasks/prisma-task.repository.js";

describe.skipIf(!process.env.TEST_DATABASE_URL)("Neon bearer authentication",()=>{
 const prisma=createPrismaClient(process.env.TEST_DATABASE_URL ?? "postgresql://localhost/unused");
 const userIds:string[]=[];
 afterAll(async()=>{await prisma.authUser.deleteMany({where:{id:{in:userIds}}});await prisma.$disconnect();});
 it("rejects missing and forged tokens, isolates users, and blocks revoked sessions",async()=>{
  const alice=await prisma.authUser.create({data:{email:`alice-${randomUUID()}@example.test`,passwordHash:"test-only"}});
  const bob=await prisma.authUser.create({data:{email:`bob-${randomUUID()}@example.test`,passwordHash:"test-only"}});
  userIds.push(alice.id,bob.id);
  const aliceSession=await createSession(prisma,alice.id);
  const bobSession=await createSession(prisma,bob.id);
  const app=createApp({authenticate:createAuthenticator({AUTH_MODE:"neon"},prisma),repositoryForUser:id=>new PrismaTaskRepository(prisma,id)});
  // Regression: a valid token containing s must be accepted by the bearer parser.
  let tokenWithS = aliceSession.token;
  for (let attempt = 0; attempt < 100 && !tokenWithS.includes("s"); attempt++) {
   tokenWithS = (await createSession(prisma, alice.id)).token;
  }
  expect(tokenWithS).toContain("s");
  expect((await request(app).get("/api/v1/tasks").set("Authorization",`Bearer ${tokenWithS}`)).status).toBe(200);
  expect((await request(app).get("/api/v1/tasks")).status).toBe(401);
  expect((await request(app).get("/api/v1/tasks").set("Authorization","Bearer "+"a".repeat(64))).status).toBe(401);
  const created=await request(app).post("/api/v1/tasks").set("Authorization",`Bearer ${aliceSession.token}`).send({title:"Isolated Neon task"});
  expect(created.status).toBe(201);
  const id=created.body.data.id as string;
  try {
   const bobList=await request(app).get("/api/v1/tasks").set("Authorization",`Bearer ${bobSession.token}`);
   expect(bobList.status).toBe(200);
   expect(bobList.body.data).toEqual([]);
   expect((await request(app).get(`/api/v1/tasks/${id}`).set("Authorization",`Bearer ${bobSession.token}`)).status).toBe(404);
   await revokeSession(prisma,aliceSession.token);
   expect((await request(app).get("/api/v1/tasks").set("Authorization",`Bearer ${aliceSession.token}`)).status).toBe(401);
  } finally { await prisma.task.deleteMany({where:{id}}); }
 });
});

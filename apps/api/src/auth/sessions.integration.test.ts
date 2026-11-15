import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "../database/prisma.js";
import { createSession, verifySession, revokeSession } from "./sessions.js";

describe.skipIf(!process.env.TEST_DATABASE_URL)("opaque auth sessions",()=>{
 const prisma=createPrismaClient(process.env.TEST_DATABASE_URL ?? "postgresql://localhost/unused");
 const users:string[]=[];
 afterAll(async()=>{await prisma.authUser.deleteMany({where:{id:{in:users}}});await prisma.$disconnect();});
 it("never stores the raw token and rejects expired, malformed and revoked sessions",async()=>{
  const user=await prisma.authUser.create({data:{email:`session-${randomUUID()}@example.test`,passwordHash:"test-only"}});
  users.push(user.id);
  const now=new Date("2026-11-15T12:00:00Z");
  const {token,expiresAt}=await createSession(prisma,user.id,now);
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  const stored=await prisma.authSession.findFirstOrThrow({where:{userId:user.id}});
  expect(stored.tokenHash).not.toBe(token);
  expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  expect(await verifySession(prisma,token,now)).toEqual({id:user.id});
  expect(await verifySession(prisma,token,expiresAt)).toBeNull();
  expect(await verifySession(prisma,"malformed",now)).toBeNull();
  expect(await verifySession(prisma,"0".repeat(64),now)).toBeNull();
  await revokeSession(prisma,token,now);
  expect(await verifySession(prisma,token,now)).toBeNull();
  await revokeSession(prisma,token,now);
 });
});

import { randomBytes, randomUUID, createHash } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "../database/prisma.js";

// Runs against the disposable PostgreSQL 17 database after Prisma migrations.
describe.skipIf(!process.env.TEST_DATABASE_URL)("independent auth schema", () => {
 const prisma = createPrismaClient(process.env.TEST_DATABASE_URL ?? "postgresql://localhost/unused");
 const users: string[] = [];
 afterAll(async () => {
  await prisma.authUser.deleteMany({where:{id:{in:users}}});
  await prisma.$disconnect();
 });
 it("enforces unique credentials and token hashes, and cascades revoked sessions", async () => {
  const email = `migration-${randomUUID()}@example.test`;
  const user = await prisma.authUser.create({data:{email,passwordHash:"test-only-not-a-real-hash"}});
  users.push(user.id);
  expect(user.id).toMatch(/^[a-f0-9-]{36}$/);
  await expect(prisma.authUser.create({data:{email,passwordHash:"other-test-value"}})).rejects.toThrow();
  const tokenHash = createHash("sha256").update(randomBytes(32)).digest("hex");
  const session = await prisma.authSession.create({data:{userId:user.id,tokenHash,expiresAt:new Date(Date.now()+3600000)}});
  expect((await prisma.authSession.findUnique({where:{tokenHash}}))?.id).toBe(session.id);
  await expect(prisma.authSession.create({data:{userId:user.id,tokenHash,expiresAt:new Date(Date.now()+3600000)}})).rejects.toThrow();
  await prisma.authUser.delete({where:{id:user.id}});
  expect(await prisma.authSession.findUnique({where:{id:session.id}})).toBeNull();
 });
});

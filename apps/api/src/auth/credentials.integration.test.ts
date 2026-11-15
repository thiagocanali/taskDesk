import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "../database/prisma.js";
import { InvalidCredentials, registerUser, signInUser } from "./credentials.js";
import { verifySession } from "./sessions.js";

describe.skipIf(!process.env.TEST_DATABASE_URL)("credential registration and sign-in",()=>{
 const prisma=createPrismaClient(process.env.TEST_DATABASE_URL ?? "postgresql://localhost/unused");
 const users:string[]=[];
 afterAll(async()=>{await prisma.authUser.deleteMany({where:{id:{in:users}}});await prisma.$disconnect();});
 it("normalizes email, hashes passwords, refuses duplicates and issues revocable tokens",async()=>{
  const email=`TEST-${randomUUID()}@example.test`;
  const password="A sufficiently long secret";
  const user=await registerUser(prisma,` ${email} `,password);
  users.push(user.id);
  expect(user.email).toBe(email.toLowerCase());
  expect((await prisma.authUser.findUniqueOrThrow({where:{id:user.id}})).passwordHash).not.toBe(password);
  await expect(registerUser(prisma,email.toLowerCase(),password)).rejects.toThrow();
  await expect(signInUser(prisma,email,"incorrect long password")).rejects.toBeInstanceOf(InvalidCredentials);
  const session=await signInUser(prisma,email,password);
  expect(session.user.id).toBe(user.id);
  expect(await verifySession(prisma,session.token)).toEqual({id:user.id});
 });
});

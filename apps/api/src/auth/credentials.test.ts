import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidCredentials, signInUser } from "./credentials.js";
import { verifyPassword } from "./passwords.js";
import { createSession } from "./sessions.js";

vi.mock("./passwords.js", () => ({
 validPassword: (password: string) => password.length >= 12,
 verifyPassword: vi.fn(), hashPassword: vi.fn(),
}));
vi.mock("./sessions.js", () => ({createSession: vi.fn(), revokeSession: vi.fn()}));

describe("login credential work", () => {
 beforeEach(() => vi.clearAllMocks());
 it("verifies a valid hash shape even when the account does not exist", async () => {
  const prisma = {authUser:{findUnique:vi.fn().mockResolvedValue(null)}} as unknown as PrismaClient;
  vi.mocked(verifyPassword).mockResolvedValue(true);
  await expect(signInUser(prisma,"missing@example.test","a-long-password")).rejects.toBeInstanceOf(InvalidCredentials);
  expect(verifyPassword).toHaveBeenCalledExactlyOnceWith("a-long-password",expect.stringMatching(/^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/));
  expect(createSession).not.toHaveBeenCalled();
 });
 it("normalizes case and surrounding whitespace before looking up credentials", async () => {
  const findUnique = vi.fn().mockResolvedValue(null);
  const prisma = {authUser:{findUnique}} as unknown as PrismaClient;
  vi.mocked(verifyPassword).mockResolvedValue(false);
  await expect(signInUser(prisma,"  USER@Example.TEST  ","a-long-password")).rejects.toBeInstanceOf(InvalidCredentials);
  expect(findUnique).toHaveBeenCalledExactlyOnceWith({where:{email:"user@example.test"}});
  expect(createSession).not.toHaveBeenCalled();
 });
 it("rejects the wrong password without issuing a session", async () => {
  const prisma = {authUser:{findUnique:vi.fn().mockResolvedValue({id:"u1",passwordHash:"stored-hash"})}} as unknown as PrismaClient;
  vi.mocked(verifyPassword).mockResolvedValue(false);
  await expect(signInUser(prisma,"known@example.test","a-long-password")).rejects.toBeInstanceOf(InvalidCredentials);
  expect(verifyPassword).toHaveBeenCalledExactlyOnceWith("a-long-password","stored-hash");
  expect(createSession).not.toHaveBeenCalled();
 });
});

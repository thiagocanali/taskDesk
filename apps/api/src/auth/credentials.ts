import type { PrismaClient } from "@prisma/client";
import { createSession, revokeSession } from "./sessions.js";
import { hashPassword, validPassword, verifyPassword } from "./passwords.js";

export class InvalidCredentials extends Error {}

// A valid, non-secret hash shape ensures unknown users still incur one scrypt.
// The result is always rejected when no user exists; this is not a credential.
const DUMMY_PASSWORD_HASH = `scrypt-v1:${"0".repeat(32)}:${"0".repeat(128)}`;

/** Identity normalization prevents duplicate case-variant email registrations. */
export function normalizeEmail(email: string): string {
 return email.trim().toLowerCase();
}

export async function registerUser(prisma: PrismaClient, email: string, password: string) {
 const normalized=normalizeEmail(email);
 if (normalized.length>320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || !validPassword(password)) {
  throw new InvalidCredentials();
 }
 const passwordHash=await hashPassword(password);
 return prisma.authUser.create({data:{email:normalized,passwordHash},select:{id:true,email:true}});
}

export async function signInUser(prisma: PrismaClient, email: string, password: string) {
 const normalized=normalizeEmail(email);
 if (normalized.length>320 || !validPassword(password)) throw new InvalidCredentials();
 const user=await prisma.authUser.findUnique({where:{email:normalized}});
 const matches = await verifyPassword(password,user?.passwordHash ?? DUMMY_PASSWORD_HASH);
 if (!user || !matches) throw new InvalidCredentials();
 const session=await createSession(prisma,user.id);
 return {user:{id:user.id,email:user.email},...session};
}

export { revokeSession };

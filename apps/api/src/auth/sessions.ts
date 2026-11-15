import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

function hashToken(token: string): string {
 return createHash("sha256").update(token).digest("hex");
}

/** Only the hash is persisted. Raw tokens must never be logged or stored in SQL. */
export async function createSession(prisma: PrismaClient, userId: string, now = new Date()) {
 const token = randomBytes(32).toString("hex");
 const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
 await prisma.authSession.create({data:{userId,tokenHash:hashToken(token),expiresAt}});
 return {token,expiresAt};
}

export async function verifySession(prisma: PrismaClient, token: string, now = new Date()) {
 if (!TOKEN_PATTERN.test(token)) return null;
 const session = await prisma.authSession.findUnique({where:{tokenHash:hashToken(token)}});
 if (!session || session.revokedAt || session.expiresAt <= now) return null;
 return {id:session.userId};
}

export async function revokeSession(prisma: PrismaClient, token: string, now = new Date()) {
 if (!TOKEN_PATTERN.test(token)) return;
 await prisma.authSession.updateMany({where:{tokenHash:hashToken(token),revokedAt:null},data:{revokedAt:now}});
}

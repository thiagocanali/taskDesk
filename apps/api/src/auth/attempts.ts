import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { normalizeEmail } from "./credentials.js";

export interface AttemptDecision { allowed: boolean; retryAfter: number; }

/** Derived identifiers are still personal data; do not log or expose these keys. */
export function accountAttemptKey(email: unknown): string | null {
 if (typeof email !== "string") return null;
 const normalized = normalizeEmail(email);
 if (normalized.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
 return createHash("sha256").update(`taskdesk:auth:${normalized}`).digest("hex");
}

/** One atomic upsert shares the budget across clients, routers and processes. */
export async function consumeAccountAttempt(prisma: PrismaClient, key: string): Promise<AttemptDecision> {
 const [decision] = await prisma.$queryRaw<AttemptDecision[]>`
  INSERT INTO "AuthAttempt" ("key", "attempts", "expiresAt")
  VALUES (${key}, 1, timezone('UTC', statement_timestamp()) + interval '15 minutes')
  ON CONFLICT ("key") DO UPDATE SET
   "attempts" = CASE
    WHEN "AuthAttempt"."expiresAt" <= timezone('UTC', statement_timestamp()) THEN 1
    ELSE LEAST("AuthAttempt"."attempts" + 1, 11) END,
   "expiresAt" = CASE
    WHEN "AuthAttempt"."expiresAt" <= timezone('UTC', statement_timestamp())
     THEN timezone('UTC', statement_timestamp()) + interval '15 minutes'
    ELSE "AuthAttempt"."expiresAt" END
  RETURNING "attempts" <= 10 AS "allowed",
   LEAST(900, GREATEST(1, CEIL(EXTRACT(EPOCH FROM
    ("expiresAt" - timezone('UTC', statement_timestamp()))))))::integer AS "retryAfter"
 `;
 if (!decision) throw new Error("Missing attempt decision");
 return decision;
}

CREATE TABLE "AuthAttempt" (
  "key" VARCHAR(64) NOT NULL,
  "attempts" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthAttempt_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "AuthAttempt_attempts_check" CHECK ("attempts" BETWEEN 1 AND 11)
);
CREATE INDEX "AuthAttempt_expiresAt_idx" ON "AuthAttempt"("expiresAt");
ALTER TABLE "AuthAttempt" ENABLE ROW LEVEL SECURITY;

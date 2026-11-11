import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: new URL("../../.env", import.meta.url) });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Client generation works without runtime secrets; migration commands reject an empty URL.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});

import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrate/introspect need a direct (non-pooled) connection. Falls back
    // to DATABASE_URL if the database isn't behind a connection pooler.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});

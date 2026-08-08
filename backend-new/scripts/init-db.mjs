-- Active: 1784871894203@@royalitcrm.cxksiwq0gwl4.ap-southeast-2.rds.amazonaws.com@5432@solocrm
#!/usr/bin/env node

// Initializes the unified PostgreSQL database with required schemas.
// Connects using SOLOCRM_DATABASE_URL and creates the service schemas.
//
// Usage:
//   node scripts/init-db.mjs

import { createRequire } from "node:module";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.example", override: false });

const databaseUrl = process.env.SOLOCRM_DATABASE_URL;

if (!databaseUrl) {
  console.error("FATAL: SOLOCRM_DATABASE_URL is not set");
  process.exit(1);
}

// Try to use Prisma to run raw SQL (preferred approach).
async function initViaPrisma() {
  // Dynamically import the auth-iam Prisma client (any service's client works for raw SQL).
  const { PrismaClient } = await import("../apps/auth-iam-service/generated/prisma/index.js");
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  try {
    await prisma.$connect();
    console.log("Connected to unified database.");

    await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS "auth_iam"');
    console.log('  Schema "auth_iam" ensured.');

    await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS "lead_management"');
    console.log('  Schema "lead_management" ensured.');

    await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS "integration"');
    console.log('  Schema "integration" ensured.');

    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    console.log('  Extension "pg_trgm" ensured.');

    console.log("\nDatabase initialization complete.");
  } finally {
    await prisma.$disconnect();
  }
}

initViaPrisma().catch((err) => {
  console.error(err);
  process.exit(1);
});

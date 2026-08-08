import { PrismaClient } from "../generated/prisma/index.js";

// Creates the Prisma client for the Auth/IAM database.
function createAuthPrismaClient() {
  return new PrismaClient();
}

export { createAuthPrismaClient };

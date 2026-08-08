import { config } from "../../../packages/config/src/index.js";
import { createAuthIamApp } from "./app.js";
import { createAuthPrismaClient } from "./prisma.js";

async function startAuthIamServer() {
  const prisma = createAuthPrismaClient();
  const app = createAuthIamApp({ prisma });

  try {
    await prisma.$connect();
    console.log("auth-iam-service: database connected");
  } catch (error) {
    console.error("auth-iam-service: database connection failed", error);
  }

  try {
    await app.locals.bootstrap();
    console.log("auth-iam-service: bootstrap completed");
  } catch (error) {
    console.error("auth-iam-service: bootstrap failed", error);
  }

  app.listen(config.authIam.port, () => {
    console.log(`auth-iam-service listening on ${config.authIam.port}`);
  });
}

startAuthIamServer();

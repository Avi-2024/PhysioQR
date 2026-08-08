import { createServer } from "node:http";
import { config } from "../../../packages/config/src/index.js";
import { createApiGatewayApp } from "./app.js";
import { attachRealtimeServer } from "./realtime.js";

// Starts the API Gateway HTTP server.
async function startApiGatewayServer() {
  const app = createApiGatewayApp();
  const server = createServer(app);
  await attachRealtimeServer(server);
  server.listen(config.gateway.port, () => {
    console.log(`api-gateway listening on ${config.gateway.port}`);
  });
}

startApiGatewayServer().catch((error) => {
  console.error(error);
  process.exit(1);
});

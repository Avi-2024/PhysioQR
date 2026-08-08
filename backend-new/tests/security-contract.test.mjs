import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

// Reads a repository file as UTF-8 text.
function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

test("auth service implements refresh rotation and replay defense", () => {
  const authService = read("apps/auth-iam-service/src/services/auth.service.js");
  const authRepository = read("apps/auth-iam-service/src/repositories/auth.repository.js");

  assert.match(authService, /verifyRefreshToken/);
  assert.match(authService, /rotateSession/);
  assert.match(authService, /revokeTokenFamily/);
  assert.match(authRepository, /refreshTokenHash/);
  assert.match(authRepository, /tokenFamilyId/);
  assert.match(authRepository, /tokenVersion/);
});

test("refresh token cookie is HTTP-only and no fallback JWT secret is hardcoded", () => {
  const authController = read("apps/auth-iam-service/src/controllers/auth.controller.js");
  const config = read("packages/config/src/index.js");

  assert.match(authController, /httpOnly:\s+true/);
  assert.match(authController, /publicAuthResult/);
  assert.match(authController, /accessToken:\s+result\.accessToken/);
  assert.doesNotMatch(authController, /refreshToken:\s+result\.refreshToken/);
  assert.doesNotMatch(config, /dev-access-secret|dev-refresh-secret|change-me/);
  assert.match(config, /accessSecret:\s+readEnv\("JWT_ACCESS_SECRET"\)/);
  assert.match(config, /refreshSecret:\s+readEnv\("JWT_REFRESH_SECRET"\)/);
});

test("Meta OAuth flow uses signed state and HTTP-only nonce cookie", () => {
  const integrationSchema = read("apps/integration-service/prisma/schema.prisma");
  const metaRoutes = read("apps/integration-service/src/routes/meta.routes.js");
  const metaController = read("apps/integration-service/src/controllers/meta.controller.js");
  const metaRepository = read("apps/integration-service/src/repositories/integration.repository.js");
  const metaService = read("apps/integration-service/src/services/meta.service.js");
  const metaApiService = read("apps/integration-service/src/services/meta-api.service.js");
  const config = read("packages/config/src/index.js");

  assert.match(integrationSchema, /model MetaAppConfig/);
  assert.match(integrationSchema, /appSecretEncrypted\s+String/);
  assert.match(metaRoutes, /\/app-config/);
  assert.match(metaRoutes, /\/oauth\/callback/);
  assert.match(metaRoutes, /\/oauth\/start/);
  assert.match(metaController, /httpOnly:\s+true/);
  assert.match(metaController, /upstep_meta_oauth_state/);
  assert.match(metaRepository, /metaAppConfig\.upsert/);
  assert.match(metaRepository, /tenantId_sourceType/);
  assert.match(metaService, /saveMetaAppConfig/);
  assert.match(metaService, /encryptToken\(payload\.appSecret\)/);
  assert.match(metaService, /platformOAuthConfig/);
  assert.match(metaService, /appId:\s+config\.meta\.appId/);
  assert.match(metaService, /appSecret:\s+config\.meta\.appSecret/);
  assert.match(metaService, /loginConfigId:\s+config\.meta\.loginConfigId/);
  assert.match(metaService, /signOAuthState/);
  assert.match(metaService, /verifyOAuthState/);
  assert.match(metaService, /upsertConnectedAccount/);
  assert.match(metaApiService, /dialog\/oauth/);
  assert.match(metaApiService, /config_id/);
  assert.match(metaApiService, /oauth\/access_token/);
  assert.match(config, /appId:\s+readEnv\("META_APP_ID"\)/);
  assert.match(config, /appSecret:\s+readEnv\("META_APP_SECRET"\)/);
  assert.match(config, /loginConfigId:\s+readEnv\("META_LOGIN_CONFIG_ID"\)/);
  assert.match(config, /webhookAppSecret:\s+readEnv\("META_WEBHOOK_APP_SECRET",\s+readEnv\("META_APP_SECRET"\)\)/);
  assert.doesNotMatch(config, /META_OAUTH_REDIRECT_URI/);
});

test("centralized error handler does not expose stack traces", () => {
  const errors = read("packages/common/src/errors.js");

  assert.match(errors, /Unexpected server error/);
  assert.doesNotMatch(errors, /stack:/);
  assert.doesNotMatch(errors, /error\.stack/);
});

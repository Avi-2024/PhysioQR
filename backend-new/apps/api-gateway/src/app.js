import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "../../../packages/config/src/index.js";
import { AppError, errorHandler, notFoundHandler, requestContext } from "../../../packages/common/src/index.js";
import { createHttpLogger, createLogger } from "../../../packages/logger/src/index.js";

const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  "connection",
  "content-length",
  "expect",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const BLOCKED_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "set-cookie",
  "transfer-encoding",
  "upgrade",
]);

// Chooses the downstream service for a public request path.
function resolveTargetUrl(path, serviceUrls = {}) {
  if (
    path.startsWith("/auth") ||
    path.startsWith("/users") ||
    path.startsWith("/roles") ||
    path.startsWith("/permissions") ||
    path.startsWith("/iam")
  ) {
    return serviceUrls.authIam || config.authIam.baseUrl;
  }

  if (
    path.startsWith("/leads") ||
    path.startsWith("/quotations") ||
    path.startsWith("/meetings") ||
    path.startsWith("/meeting-staff") ||
    path.startsWith("/lead-fields") ||
    path.startsWith("/lead-settings") ||
    path.startsWith("/lead-sources") ||
    path.startsWith("/pipelines")
  ) {
    return serviceUrls.leadManagement || config.leadManagement.baseUrl;
  }

  if (
    path.startsWith("/integrations") ||
    path.startsWith("/webhooks/meta")
  ) {
    return serviceUrls.integration || config.integration.baseUrl;
  }

  return null;
}

// Captures the original JSON bytes so signed webhooks can be proxied intact.
function captureRawBody(req, _res, buffer) {
  req.rawBody = buffer;
}

// Copies request headers that are safe for service-to-service forwarding.
function forwardedHeaders(req) {
  const headers = { ...req.headers };

  const connectionTokens = String(headers.connection || "")
    .split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);

  for (const headerName of Object.keys(headers)) {
    const normalizedHeader = headerName.toLowerCase();
    if (HOP_BY_HOP_REQUEST_HEADERS.has(normalizedHeader) || connectionTokens.includes(normalizedHeader)) {
      delete headers[headerName];
    }
  }

  headers["x-forwarded-host"] = req.get("x-forwarded-host") || req.get("host") || "";
  headers["x-forwarded-proto"] = req.get("x-forwarded-proto") || req.protocol || "http";

  return headers;
}

// Returns the exact request body bytes when available for downstream proxying.
function proxiedRequestBody(req) {
  if (["GET", "HEAD"].includes(req.method)) {
    return undefined;
  }
  if (req.rawBody?.length) {
    return req.rawBody;
  }
  return JSON.stringify(req.body || {});
}

// Forwards downstream response headers without invalid hop-by-hop metadata.
function forwardResponseHeaders(response, res) {
  response.headers.forEach((value, key) => {
    if (!BLOCKED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  });

  const setCookies = response.headers.getSetCookie?.() || [];
  if (setCookies.length > 0) {
    res.setHeader("set-cookie", setCookies);
    return;
  }

  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    res.setHeader("set-cookie", setCookie);
  }
}

// Proxies a request from the gateway to a downstream service.
async function proxyRequest(req, res, next, serviceUrls = {}) {
  const controller = new globalThis.AbortController();
  const timeout = setTimeout(() => controller.abort(), config.gateway.proxyTimeoutMs);

  try {
    const target = resolveTargetUrl(req.path, serviceUrls);
    if (!target) {
      clearTimeout(timeout);
      return next();
    }

    const response = await fetch(`${target}${req.originalUrl}`, {
      method: req.method,
      headers: forwardedHeaders(req),
      body: proxiedRequestBody(req),
      redirect: "manual",
      signal: controller.signal,
    });
    const text = await response.text();

    res.status(response.status);
    forwardResponseHeaders(response, res);
    return res.send(text);
  } catch (error) {
    if (error.name === "AbortError") {
      return next(
        new AppError(504, "Downstream service timed out", "GATEWAY_DOWNSTREAM_TIMEOUT", {
          timeoutMs: config.gateway.proxyTimeoutMs,
        }),
      );
    }
    return next(new AppError(502, "Downstream service unavailable", "GATEWAY_DOWNSTREAM_UNAVAILABLE", { cause: error.message }));
  } finally {
    clearTimeout(timeout);
  }
}

// Builds public static branding for the dedicated company CRM.
function buildPublicBranding() {
  return {
    appName: process.env.PUBLIC_BRANDING_APP_NAME || process.env.APP_NAME || "Royal IT CRM",
    logoUrl: process.env.PUBLIC_BRANDING_LOGO_URL || "/brand/default-logo.png",
    faviconUrl: process.env.PUBLIC_BRANDING_FAVICON_URL || "/brand/default-favicon.svg",
    primaryColor: process.env.PUBLIC_BRANDING_PRIMARY_COLOR || "#1F7A8C",
    secondaryColor: process.env.PUBLIC_BRANDING_SECONDARY_COLOR || "#F2B705",
    sidebarColor: process.env.PUBLIC_BRANDING_SIDEBAR_COLOR || "#14213D",
    backgroundColor: process.env.PUBLIC_BRANDING_BACKGROUND_COLOR || "#F6F8FB",
    textColor: process.env.PUBLIC_BRANDING_TEXT_COLOR || "#1C2535",
    supportEmail: process.env.PUBLIC_BRANDING_SUPPORT_EMAIL || "support@example.com",
    supportPhone: process.env.PUBLIC_BRANDING_SUPPORT_PHONE || "+1 555 0100",
  };
}

// Returns public static branding without requiring authentication.
function publicBranding(_req, res) {
  return res.status(200).json({ data: buildPublicBranding() });
}

// Creates the API Gateway Express application.
function createApiGatewayApp({ serviceUrls = {} } = {}) {
  const logger = createLogger("api-gateway");
  const app = express();

  app.use(helmet());
  app.use(cors({ credentials: true, origin: true }));
  app.use(express.json({ limit: "2mb", verify: captureRawBody }));
  app.use(requestContext);
  app.use(createHttpLogger(logger));

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok", service: "api-gateway" }));
  app.get("/public/branding", publicBranding);
  app.use((req, res, next) => proxyRequest(req, res, next, serviceUrls));
  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}

export { createApiGatewayApp };

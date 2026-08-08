import { AppError } from "./errors.js";

// Sends a JSON request to another service with request context headers.
async function serviceRequest(url, { method = "GET", body, context, headers = {}, timeoutMs = 15000 } = {}) {
  const controller = new globalThis.AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-request-id": context?.requestId || "",
        authorization: context?.rawAuthorization || "",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new AppError(504, "Service request timed out", "SERVICE_REQUEST_TIMEOUT", { url, timeoutMs });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AppError(response.status, payload?.error?.message || "Service request failed", payload?.error?.code || "SERVICE_REQUEST_FAILED", payload?.error?.details);
  }
  return payload;
}

export { serviceRequest };

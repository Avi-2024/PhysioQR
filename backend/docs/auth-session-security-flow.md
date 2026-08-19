# Auth Session Security Flow

## Purpose

This module hardens authentication with access tokens, refresh-token rotation, HTTP-only cookies, token versioning, and server-side session tracking.

## Login Methods

Staff roles:

- Admin
- Agent
- Doctor

Use:

`POST /api/auth/login`

with email/mobile + password.

Patient:

Uses OTP only:

- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`

## Token Model

Access token:

- JWT
- short-lived
- returned as `token` and `accessToken` for API clients
- also set in HTTP-only cookie `physioqr_access`

Refresh token:

- opaque random token
- stored in DB only as SHA-256 hash
- returned as `refreshToken` for API clients
- also set in HTTP-only cookie `physioqr_refresh`
- rotated on every refresh

## Session Record

Refresh sessions are stored in `AuthSession`.

Important fields:

- `ownerType`: `user` or `patient`
- `user` / `patient`
- `role`
- `tokenHash`
- `tokenVersion`
- `userAgent`
- `ipAddress`
- `expiresAt`
- `lastUsedAt`
- `revokedAt`
- `revokedReason`
- `replacedBy`

Expired sessions are automatically removed by MongoDB TTL index.

## Refresh Flow

Endpoint:

`POST /api/auth/refresh`

Input:

- refresh token from body, or
- HTTP-only refresh cookie

Behavior:

1. Hashes incoming refresh token.
2. Finds active session.
3. Verifies owner account is active.
4. Verifies token version still matches owner.
5. Creates a new refresh session.
6. Revokes old refresh session with reason `rotated`.
7. Returns new access token and refresh token.
8. Sets fresh HTTP-only cookies.

## Logout Flow

Endpoint:

`POST /api/auth/logout`

Behavior:

1. Revokes current refresh session if provided.
2. Clears auth cookies.
3. Returns success even if token is already absent.

## Session Management

List current sessions:

`GET /api/auth/sessions`

Revoke one session:

`DELETE /api/auth/sessions/:id`

Rules:

- User sees only their own sessions.
- Patient sees only their own sessions.

## Token Versioning

`User` and `Patient` both include `tokenVersion`.

Access tokens include `tokenVersion`.

Middleware rejects tokens when the stored account version does not match the token.

Current invalidation event:

- Staff `change-password` increments `tokenVersion` and revokes all staff sessions.

## Cookie Settings

Configured by:

```env
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
ACCESS_TOKEN_COOKIE_NAME=physioqr_access
REFRESH_TOKEN_COOKIE_NAME=physioqr_refresh
```

Production cookies:

- `httpOnly=true`
- `secure=true`
- `sameSite=none`

Development cookies:

- `httpOnly=true`
- `secure=false`
- `sameSite=lax`

## Backward Compatibility

Existing API clients can continue using:

```http
Authorization: Bearer ACCESS_TOKEN
```

Browser clients can rely on cookies when calling with credentials enabled.

## Verification

Covered by `npm run test:integration`:

- staff password login creates refresh session
- refresh rotates refresh token
- old refresh token stops working after rotation
- active sessions list works
- logout revokes refresh token
- patient OTP auth creates refresh session

// Only protected application workspaces should redirect to sign-in when
// authentication expires. Public pages (home, register, doctors, patients,
// login and payment results) must stay at the URL the visitor opened.
const PROTECTED_WORKSPACES = ['/admin', '/agent', '/doctor', '/patient'] as const;

export const isProtectedWorkspacePath = (pathname: string): boolean =>
  PROTECTED_WORKSPACES.some((root) => pathname === root || pathname.startsWith(`${root}/`));

// A homepage fee-display request does not require an authenticated session.
// Its failure must never clear a logged-in user or send a public visitor to login.
export const isPublicDisplayRequest = (requestUrl?: string): boolean =>
  /(?:^|\/)settings\/direct-registration-fee(?:[?#]|$)/.test(requestUrl || '');

export const shouldHandleUnauthorizedSession = (
  status: number | undefined,
  requestUrl: string | undefined,
  currentPath: string,
): boolean => status === 401
  && isProtectedWorkspacePath(currentPath)
  && !isPublicDisplayRequest(requestUrl);

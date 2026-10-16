import apiClient from './api-client';

// When moving between Doctor, Admin, Agent or Patient accounts on one device,
// revoke the refresh-cookie session as well as clearing locally stored tokens.
// Navigation happens even if the network is unavailable.
export async function signOutAndSwitchAccount(
  clearLocalSession: () => void,
  navigateToLogin: () => void,
): Promise<void> {
  try {
    await apiClient.post('/auth/logout', {}, { timeout: 4000 });
  } catch {
    // Network/server errors must not trap someone in the previous dashboard.
    // The local token and cached user data still have to be cleared.
  } finally {
    clearLocalSession();
    navigateToLogin();
  }
}

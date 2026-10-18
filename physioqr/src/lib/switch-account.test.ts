import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api-client', () => ({
  default: { post: vi.fn() },
}));

import apiClient from './api-client';
import { signOutAndSwitchAccount } from './switch-account';

const post = vi.mocked(apiClient.post);

describe('signOutAndSwitchAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('revokes the backend refresh-cookie session before clearing local auth and routing to login', async () => {
    post.mockResolvedValue({ data: { message: 'Logged out' } } as never);
    const clearLocal = vi.fn();
    const openLogin = vi.fn();

    await signOutAndSwitchAccount(clearLocal, openLogin);

    expect(post).toHaveBeenCalledWith('/auth/logout', {}, { timeout: 4000 });
    expect(clearLocal).toHaveBeenCalledTimes(1);
    expect(openLogin).toHaveBeenCalledTimes(1);
    expect(post.mock.invocationCallOrder[0]).toBeLessThan(clearLocal.mock.invocationCallOrder[0]);
    expect(clearLocal.mock.invocationCallOrder[0]).toBeLessThan(openLogin.mock.invocationCallOrder[0]);
  });

  it('still signs out locally and opens login if the API is unreachable', async () => {
    post.mockRejectedValue(new Error('Network unavailable'));
    const clearLocal = vi.fn();
    const openLogin = vi.fn();

    await expect(signOutAndSwitchAccount(clearLocal, openLogin)).resolves.toBeUndefined();

    expect(clearLocal).toHaveBeenCalledTimes(1);
    expect(openLogin).toHaveBeenCalledTimes(1);
  });
});

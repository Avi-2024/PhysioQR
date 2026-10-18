// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MobileAccountActions } from './MobileAccountActions';

afterEach(cleanup);

describe('MobileAccountActions', () => {
  it.each(['Doctor', 'Admin', 'Agent'] as const)(
    'shows an accessible switch-account action in the %s mobile drawer',
    (role) => {
      const onSwitchAccount = vi.fn();
      render(<MobileAccountActions role={role} name="Portal user" onSwitchAccount={onSwitchAccount} />);

      expect(screen.getByText(`Signed in as ${role}`)).toBeTruthy();
      const button = screen.getByRole('button', { name: /log out and switch account/i });
      expect(button.textContent).toContain('Logout / Switch Account');

      fireEvent.click(button);
      expect(onSwitchAccount).toHaveBeenCalledTimes(1);
    },
  );
});

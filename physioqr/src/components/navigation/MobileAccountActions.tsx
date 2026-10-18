import { LogOut } from 'lucide-react';

type MobileAccountActionsProps = {
  name?: string;
  role: 'Doctor' | 'Admin' | 'Agent';
  onSwitchAccount: () => void;
};

// Mobile drawers must expose the same sign-out action as desktop sidebars.
// Log out first, then let the next role authenticate on the login screen.
export function MobileAccountActions({
  name,
  role,
  onSwitchAccount,
}: MobileAccountActionsProps) {
  return (
    <div className="shrink-0 border-t border-neutral-800 bg-neutral-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <p className="truncate text-xs font-semibold text-white">
        {name || role}
      </p>
      <p className="mt-1 text-xs text-neutral-400">Signed in as {role}</p>
      <button
        type="button"
        onClick={onSwitchAccount}
        aria-label="Log out and switch account"
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-neutral-600 bg-neutral-800 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Logout / Switch Account
      </button>
    </div>
  );
}

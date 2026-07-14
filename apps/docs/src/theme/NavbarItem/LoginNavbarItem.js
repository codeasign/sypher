import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useAuth } from '@site/src/contexts/AuthContext';
import { getAppOrigin, getAppLoginUrl, getAppLogoutUrl } from '@sypher/auth-core/src/urls';

function DashboardIcon() {
  return (
    <svg
      className="login-link-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      className="login-link-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

// Docs never initiates login/logout itself -- app.sypher is the only place
// those Supabase calls happen (see apps/app/src/contexts/AuthContext.tsx).
// This just links out, deriving the target from the shared cookie-config
// domain so the prod placeholder swaps both sides at once.
function LoginButton() {
  const { user } = useAuth();

  if (user) {
    return (
      <span className="login-link-group">
        <a href={`${getAppOrigin()}/dashboard`} className="navbar__link login-link dashboard-link">
          <DashboardIcon />
          Dashboard
        </a>
        <a href={getAppLogoutUrl()} className="navbar__link login-link logout-link">
          <LogoutIcon />
          Log out
        </a>
      </span>
    );
  }

  return (
    <a href={getAppLoginUrl()} className="navbar__link login-link">
      Log in
    </a>
  );
}

export default function LoginNavbarItem() {
  return (
    <BrowserOnly fallback={<button type="button" className="navbar__link login-link">Log in</button>}>
      {() => <LoginButton />}
    </BrowserOnly>
  );
}

import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useAuth } from '@site/src/contexts/AuthContext';
import { getAppOrigin, getAppLoginUrl, getAppLogoutUrl, getAppSignupUrl } from '@sypher/auth-core/src/urls';

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
          Dashboard
        </a>
        <a href={getAppLogoutUrl()} className="navbar__link login-link">
          Log out
        </a>
      </span>
    );
  }

  return (
    <span className="login-link-group">
      <a href={getAppSignupUrl()} className="navbar__link login-link signup-link">
        Sign Up
      </a>
      <a href={getAppLoginUrl()} className="navbar__link login-link">
        Log in
      </a>
    </span>
  );
}

export default function LoginNavbarItem() {
  return (
    <BrowserOnly fallback={<button type="button" className="navbar__link login-link">Log in</button>}>
      {() => <LoginButton />}
    </BrowserOnly>
  );
}

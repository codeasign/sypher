import React, { useState } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Link from '@docusaurus/Link';
import { useAuth } from '@site/src/contexts/AuthContext';

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

function LoginButton() {
  const { supabase, user } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!supabase) {
      window.location.href = '/login';
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      window.location.href = '/login';
    }
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await supabase?.auth.signOut();
    } finally {
      window.location.href = '/';
    }
  }

  if (user) {
    return (
      <span className="login-link-group">
        <Link to="/dashboard" className="navbar__link login-link dashboard-link">
          <DashboardIcon />
          Dashboard
        </Link>
        <button
          type="button"
          className="navbar__link login-link logout-link"
          onClick={handleLogout}
          disabled={loading}
        >
          <LogoutIcon />
          {loading ? '…' : 'Log out'}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      className="navbar__link login-link"
      onClick={handleLogin}
      disabled={loading}
    >
      {loading ? '…' : 'Log in'}
    </button>
  );
}

export default function LoginNavbarItem() {
  return (
    <BrowserOnly fallback={<button type="button" className="navbar__link login-link">Log in</button>}>
      {() => <LoginButton />}
    </BrowserOnly>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';

export default function ForgotPasswordPage(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    const res = await apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    setMessage(body.message ?? 'If an account exists for that email, a reset link has been sent.');
  }

  return (
    <main>
      <h1>Forgot password</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      {message && <p role="status">{message}</p>}
    </main>
  );
}

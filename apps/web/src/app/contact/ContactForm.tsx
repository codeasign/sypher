'use client';

import { useState, type FormEvent } from 'react';
import { apiFetch } from '@/lib/api';
import RecaptchaV2, { recaptchaConfigured } from '@/components/RecaptchaV2';
import styles from './styles.module.css';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function ContactForm(): React.JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [botcheck, setBotcheck] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (recaptchaConfigured && !captchaToken) {
      setError('Please complete the bot verification and try again.');
      return;
    }
    setStatus('loading');
    setError(null);

    const res = await apiFetch('/contact', {
      method: 'POST',
      body: JSON.stringify({ name, email, message, botcheck, recaptchaToken: captchaToken }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message ?? 'Something went wrong — please try again.');
      setStatus('error');
      setCaptchaResetSignal((signal) => signal + 1);
      return;
    }

    setStatus('success');
  }

  if (status === 'success') {
    return (
      <div className={styles.successCard}>
        <svg className={styles.successIcon} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <h2 className={styles.successTitle}>Message sent</h2>
        <p className={styles.successText}>Thanks for reaching out — we&apos;ll get back to you soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="text"
        name="botcheck"
        value={botcheck}
        onChange={(e) => setBotcheck(e.target.value)}
        className={styles.honeypot}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div className={styles.field}>
        <label htmlFor="name">Name</label>
        <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label htmlFor="message">Message</label>
        <textarea id="message" required rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>

      <RecaptchaV2 resetSignal={captchaResetSignal} onTokenChange={setCaptchaToken} />

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <button type="submit" className={styles.submitBtn} disabled={status === 'loading'}>
        {status === 'loading' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { resolveCompanyCode, stashCompanyContext } from '@/data/corporate';
import styles from './styles.module.css';

// Step 1 of the corporate portal: the visitor names their company by its
// Sypher code. On success we brand and route to the login screen; an
// expired company is stopped here with a specific message rather than
// being sent to a login it can't pass.
export default function CorporateEntryPage(): React.JSX.Element {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await resolveCompanyCode(code);
    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }
    if (!result.company.active) {
      setSubmitting(false);
      setError(`${result.company.name}'s Sypher access has expired. Contact your administrator.`);
      return;
    }

    stashCompanyContext(result.company);
    router.push('/corporate/login');
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.sypherBrand}>
          <span className={styles.sypherDot} />
          Sypher for Business
        </div>

        <h1 className={styles.title}>Your company code</h1>
        <p className={styles.subtitle}>
          Enter the code your organisation uses for Sypher. We&rsquo;ll take you to your company&rsquo;s
          sign-in.
        </p>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="code">Company code</label>
            <input
              id="code"
              className={styles.codeInput}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
              required
              placeholder="ACMECORP"
            />
          </div>

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}

          <button type="submit" className={styles.submitBtn} disabled={submitting || code.trim().length === 0}>
            {submitting ? 'Checking…' : 'Continue'}
          </button>
        </form>

        <p className={styles.poweredBy}>Powered by Sypher</p>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  COHORT_INTEREST_INITIAL_FIELDS as initialFields,
  buildCohortInterestPayload,
  submitToWeb3Forms,
} from '@sypher/career-tools';
import { trackEvent } from '@/lib/analytics';
import styles from './styles.module.css';

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

export default function CohortInterestForm({ cohortTitle }: { cohortTitle: string }): React.JSX.Element {
  const [fields, setFields] = useState(initialFields);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  function updateField(key: keyof typeof initialFields, value: string): void {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;
      if (!accessKey) {
        setStatus('error');
        setErrorMessage("Cohort interest signups aren't configured yet — please contact support.");
        return;
      }
      const payload = buildCohortInterestPayload({ accessKey, fields, cohortTitle });
      const result = await submitToWeb3Forms(payload);

      if (!result.success) {
        setStatus('error');
        setErrorMessage(result.message || 'Something went wrong. Please try again.');
        return;
      }

      trackEvent('cohort_interest_submit', { cohort: cohortTitle });
      setStatus('success');
      setFields(initialFields);
    } catch {
      setStatus('error');
      setErrorMessage('Something went wrong. Please check your connection and try again.');
    }
  }

  if (status === 'success') {
    return <p className={styles.successMessage}>Thanks — we&apos;ve got your interest registered. We&apos;ll be in touch.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel} htmlFor="cohort-interest-name">Name</label>
        <input
          id="cohort-interest-name"
          type="text"
          required
          className={styles.textInput}
          value={fields.name}
          onChange={(e) => updateField('name', e.target.value)}
        />
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel} htmlFor="cohort-interest-email">Email</label>
        <input
          id="cohort-interest-email"
          type="email"
          required
          className={styles.textInput}
          value={fields.email}
          onChange={(e) => updateField('email', e.target.value)}
        />
      </div>
      <div className={styles.fieldRow}>
        <label className={styles.fieldLabel} htmlFor="cohort-interest-phone">Phone (optional)</label>
        <input
          id="cohort-interest-phone"
          type="tel"
          className={styles.textInput}
          value={fields.phone}
          onChange={(e) => updateField('phone', e.target.value)}
        />
      </div>
      {status === 'error' && <p className={styles.errorMessage}>{errorMessage}</p>}
      <button type="submit" className={styles.submitBtn} disabled={status === 'loading'}>
        {status === 'loading' ? 'Submitting…' : 'Register Interest'}
      </button>
    </form>
  );
}

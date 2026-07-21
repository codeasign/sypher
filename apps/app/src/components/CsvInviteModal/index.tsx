'use client';

import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import { useAuth } from '@/contexts/AuthContext';
import { distinctCompanyNames, bulkInviteFromCsv } from '@/data/pendingInvites';
import { trackEvent } from '@/lib/analytics';
import styles from './styles.module.css';

const INVITABLE_ROLES = ['company_hr', 'company_employees'];

interface ParsedRow {
  email: string;
  role: string;
  name: string;
  error: string | null;
}

interface InviteResult {
  email: string;
  outcome: 'updated_existing' | 'invited' | 'error';
  error?: string | null;
}

interface CsvInviteModalProps {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}

function normalizeEmail(email: string): string {
  return (email ?? '').trim().toLowerCase();
}

function parseCsv(text: string): ParsedRow[] {
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const seen = new Set<string>();
  const rows: ParsedRow[] = [];
  for (const raw of data) {
    const email = normalizeEmail(raw.email ?? '');
    const role = (raw.role ?? '').trim().toLowerCase();
    const name = (raw.name ?? '').trim();
    if (!email) continue;
    if (seen.has(email)) {
      rows.push({ email, role, name, error: 'Duplicate email in file' });
      continue;
    }
    seen.add(email);
    if (!name) {
      rows.push({ email, role, name, error: 'Missing name' });
      continue;
    }
    if (!INVITABLE_ROLES.includes(role)) {
      rows.push({ email, role, name, error: `Invalid role "${raw.role ?? ''}"` });
      continue;
    }
    rows.push({ email, role, name, error: null });
  }
  return rows;
}

export default function CsvInviteModal({ open, onClose, onInvited }: CsvInviteModalProps): React.JSX.Element | null {
  const { supabase, user } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    distinctCompanyNames(supabase).then(setCompanyOptions);
  }, [open, supabase]);

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);
    const reader = new FileReader();
    reader.onload = () => {
      setRows(parseCsv(String(reader.result ?? '')));
    };
    reader.readAsText(file);
  }

  const validRows = rows.filter((r) => !r.error);
  const invalidRows = rows.filter((r) => r.error);
  const canSend = companyName.trim().length > 0 && validRows.length > 0 && !sending;

  async function handleSendInvites(): Promise<void> {
    if (!canSend) return;
    setSending(true);
    trackEvent('manageusers_invite_submit', { row_count: validRows.length });
    try {
      const outcome = await bulkInviteFromCsv(supabase, {
        rows: validRows,
        companyName: companyName.trim(),
        adminUserId: user?.id ?? null,
      });
      onInvited();

      const results = outcome as InviteResult[];
      trackEvent('manageusers_invite_result', {
        invited_count: results.filter((r) => r.outcome === 'invited').length,
        updated_count: results.filter((r) => r.outcome === 'updated_existing').length,
        error_count: results.filter((r) => r.outcome === 'error').length,
      });

      const hasErrors = results.some((r) => r.outcome === 'error');
      if (hasErrors) {
        setResults(results);
      } else {
        handleClose();
        return;
      }
    } catch (err) {
      trackEvent('manageusers_invite_result', {
        invited_count: 0,
        updated_count: 0,
        error_count: validRows.length,
      });
      setResults(
        validRows.map((row) => ({
          email: row.email,
          outcome: 'error',
          error: err instanceof Error ? err.message : 'Unexpected error sending invites.',
        }))
      );
    } finally {
      setSending(false);
    }
  }

  function handleReset(): void {
    setRows([]);
    setFileName('');
    setResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose(): void {
    handleReset();
    setCompanyName('');
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={handleClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-invite-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="csv-invite-title" className={styles.title}>Invite Employees</h2>
          <button type="button" className={styles.closeBtn} onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        {!results ? (
          <>
            <p className={styles.helpText}>
              Upload a CSV for one company. Each row needs a <code>name</code>, an{' '}
              <code>email</code>, and a <code>role</code> of <code>company_hr</code> or{' '}
              <code>company_employees</code>.
            </p>

            {rows.length === 0 && (
              <table className={styles.exampleTable}>
                <thead>
                  <tr>
                    <th>name</th>
                    <th>email</th>
                    <th>role</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Jane Doe</td>
                    <td>jane.doe@anorganization.com</td>
                    <td>company_hr</td>
                  </tr>
                  <tr>
                    <td>John Smith</td>
                    <td>john.smith@anorganization.com</td>
                    <td>company_employees</td>
                  </tr>
                </tbody>
              </table>
            )}

            <label className={styles.fieldLabel} htmlFor="csv-invite-company">
              Company name
            </label>
            <input
              id="csv-invite-company"
              type="text"
              className={styles.textInput}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company Name"
              list="csv-invite-company-options"
              disabled={sending}
            />
            <datalist id="csv-invite-company-options">
              {companyOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            <label className={styles.fieldLabel} htmlFor="csv-invite-file">
              CSV file
            </label>
            <input
              id="csv-invite-file"
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className={styles.fileInput}
              onChange={handleFileChange}
              disabled={sending}
            />

            {rows.length > 0 && (
              <div className={styles.previewWrapper}>
                <div className={styles.previewSummary}>
                  <span>{fileName}</span>
                  <span>
                    {validRows.length} valid{invalidRows.length > 0 ? `, ${invalidRows.length} invalid` : ''}
                  </span>
                </div>
                <div className={styles.previewTable}>
                  {rows.map((row, i) => (
                    <div key={`${row.email}-${i}`} className={styles.previewRow}>
                      <span className={styles.previewEmail}>
                        {row.name ? `${row.name} — ${row.email}` : row.email}
                      </span>
                      {row.error ? (
                        <span className={styles.previewError}>{row.error}</span>
                      ) : (
                        <span className={styles.previewRole}>{row.role}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={handleClose} disabled={sending}>
                Cancel
              </button>
              <button type="button" className={styles.sendBtn} onClick={handleSendInvites} disabled={!canSend}>
                {sending ? (
                  <span className={styles.sendBtnLoading}>
                    <span className={styles.spinner} />
                    Sending…
                  </span>
                ) : (
                  `Send invites${validRows.length ? ` (${validRows.length})` : ''}`
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.resultsTable}>
              {results.map((r) => (
                <div key={r.email} className={styles.resultRow}>
                  <span className={styles.previewEmail}>{r.email}</span>
                  <span
                    className={
                      r.outcome === 'error'
                        ? styles.previewError
                        : r.outcome === 'invited'
                        ? styles.resultInvited
                        : styles.resultUpdated
                    }
                  >
                    {r.outcome === 'error'
                      ? r.error
                      : r.outcome === 'invited'
                      ? 'Invited'
                      : 'Role/company updated'}
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.sendBtn} onClick={handleClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

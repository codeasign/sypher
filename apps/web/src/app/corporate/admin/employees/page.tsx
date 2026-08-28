'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getInviteLink,
  importEmployeesCsv,
  listEmployees,
  listGroups,
  removeEmployee,
  resendInvite,
  setEmployeeGroups,
  type CompanyAdminEmployee,
  type CompanyAdminGroup,
  type CompanyAdminImportReport,
} from '@/data/companyAdmin';
import styles from '../admin.module.css';

const CSV_TEMPLATE = 'Full Name,Email Id,Department,Role,Manager Name\nAsha Rao,asha@acme.com,Engineering,Senior Engineer,Ravi Kumar';

export default function CorporateAdminEmployeesPage(): React.JSX.Element {
  const [employees, setEmployees] = useState<CompanyAdminEmployee[]>([]);
  const [groups, setGroups] = useState<CompanyAdminGroup[]>([]);
  const [csv, setCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<CompanyAdminImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [e, g] = await Promise.all([listEmployees(), listGroups()]);
      setEmployees(e);
      setGroups(g);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleImport(): Promise<void> {
    if (!csv.trim()) return;
    setImporting(true);
    setError(null);
    setReport(null);
    try {
      const r = await importEmployeesCsv(csv);
      setReport(r);
      setCsv('');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  function onFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ''));
    reader.readAsText(file);
  }

  const groupName = (id: string): string => groups.find((g) => g.id === id)?.name ?? id;

  return (
    <>
      <h1 className={styles.h1}>Employees</h1>

      <div className={styles.sectionTitle}>Import from CSV</div>
      <p className={styles.hint}>
        Columns: <code>Full Name, Email Id, Department, Role, Manager Name</code>. Department becomes a
        group (created if new). Role is a job title. New people get an email to set their password.
      </p>
      <textarea
        className={styles.textarea}
        placeholder={CSV_TEMPLATE}
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
      />
      <div className={styles.row} style={{ marginTop: '0.6rem' }}>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        <button className={styles.btn} onClick={() => void handleImport()} disabled={importing || !csv.trim()}>
          {importing ? 'Importing…' : 'Import'}
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {report && (
        <p className={styles.ok}>
          Processed {report.rowsProcessed} — {report.created} created, {report.linked} linked, {report.updated} updated
          {report.skipped.length > 0 && (
            <>
              {' '}
              · {report.skipped.length} skipped: {report.skipped.map((s) => `${s.email} (${s.reason})`).join(', ')}
            </>
          )}
        </p>
      )}

      <div className={styles.sectionTitle} style={{ marginTop: '2rem' }}>
        Roster ({employees.length})
      </div>
      {employees.length === 0 ? (
        <p className={styles.hint}>No employees yet.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Title</th>
              <th>Manager</th>
              <th>Groups</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <EmployeeRow key={e.userId} employee={e} groups={groups} groupName={groupName} onChanged={refresh} />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function EmployeeRow({
  employee,
  groups,
  groupName,
  onChanged,
}: {
  employee: CompanyAdminEmployee;
  groups: CompanyAdminGroup[];
  groupName: (id: string) => string;
  onChanged: () => Promise<void>;
}): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState<string[]>(employee.groupIds);
  const [busy, setBusy] = useState(false);
  const [linkMsg, setLinkMsg] = useState<string | null>(null);

  async function save(): Promise<void> {
    setBusy(true);
    try {
      await setEmployeeGroups(employee.userId, sel);
      setEditing(false);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function doResend(): Promise<void> {
    setBusy(true);
    setLinkMsg(null);
    try {
      await resendInvite(employee.userId);
      setLinkMsg('Invite email sent.');
    } catch (e) {
      setLinkMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function doCopyLink(): Promise<void> {
    setBusy(true);
    setLinkMsg(null);
    try {
      const { url } = await getInviteLink(employee.userId);
      try {
        await navigator.clipboard.writeText(url);
        setLinkMsg('Set-password link copied to clipboard.');
      } catch {
        setLinkMsg(url);
      }
    } catch (e) {
      setLinkMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function doRemove(): Promise<void> {
    if (!window.confirm(`Remove ${employee.fullName ?? employee.email}? They lose all company access.`)) return;
    setBusy(true);
    try {
      await removeEmployee(employee.userId);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr style={employee.status === 'removed' ? { opacity: 0.5 } : undefined}>
      <td>{employee.fullName ?? '—'}</td>
      <td>
        {employee.email}
        {!employee.hasPassword && <span className={`${styles.tag} ${styles.pending}`} style={{ marginLeft: 6 }}>Invite pending</span>}
      </td>
      <td>{employee.jobTitle ?? '—'}</td>
      <td>{employee.managerName ?? '—'}</td>
      <td>
        {editing ? (
          <div className={styles.checkList} style={{ margin: 0 }}>
            {groups.map((g) => (
              <label key={g.id} className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={sel.includes(g.id)}
                  onChange={(e) =>
                    setSel((s) => (e.target.checked ? [...s, g.id] : s.filter((x) => x !== g.id)))
                  }
                />
                {g.name}
              </label>
            ))}
            <div style={{ marginTop: 4 }}>
              <button className={styles.linkBtn} onClick={() => void save()} disabled={busy}>
                Save
              </button>
              <button className={styles.linkBtn} onClick={() => { setSel(employee.groupIds); setEditing(false); }}>
                Cancel
              </button>
            </div>
          </div>
        ) : employee.groupIds.length === 0 ? (
          <span className={styles.hint}>none</span>
        ) : (
          employee.groupIds.map((id) => (
            <span key={id} className={styles.tag}>
              {groupName(id)}
            </span>
          ))
        )}
      </td>
      <td style={{ whiteSpace: 'nowrap' }}>
        {!editing && employee.status !== 'removed' && (
          <>
            <button className={styles.linkBtn} onClick={() => setEditing(true)}>
              Groups
            </button>
            {!employee.hasPassword && (
              <>
                <button className={styles.linkBtn} onClick={() => void doResend()} disabled={busy}>
                  Resend
                </button>
                <button className={styles.linkBtn} onClick={() => void doCopyLink()} disabled={busy}>
                  Copy link
                </button>
              </>
            )}
            <button className={`${styles.linkBtn} ${styles.linkBtnDanger}`} onClick={() => void doRemove()} disabled={busy}>
              Remove
            </button>
          </>
        )}
        {linkMsg && <div className={styles.groupMeta} style={{ marginTop: 4, wordBreak: 'break-all' }}>{linkMsg}</div>}
      </td>
    </tr>
  );
}

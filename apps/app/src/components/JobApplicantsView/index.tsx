'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listJobApplicants } from '@/data/jobApplicants';
import styles from './styles.module.css';

interface Applicant {
  applicant_id: string;
  full_name: string | null;
  email: string | null;
  resume_url: string | null;
  social_links: Record<string, string> | null;
  current_status: string | null;
  designation_name: string | null;
  designation_seniority: string | null;
  skills: string[] | null;
  applied_at: string;
}

interface JobApplicantsViewProps {
  jobId: string;
  jobTitle: string;
  onBack: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function JobApplicantsView({ jobId, jobTitle, onBack }: JobApplicantsViewProps): React.JSX.Element {
  const { supabase } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load(): Promise<void> {
      setLoading(true);
      const data = await listJobApplicants(supabase, jobId);
      if (active) {
        setApplicants(data);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase, jobId]);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          ← Back to job posts
        </button>
      </div>

      <div className={styles.header}>
        <h1 className={styles.heading}>Applicants</h1>
        <p className={styles.subtitle}>{jobTitle}</p>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading applicants...</p>
        </div>
      ) : applicants.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No applicants yet.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {applicants.map((applicant) => {
            const social = applicant.social_links ?? {};
            const socialLinks = Object.entries(social).filter(([, url]) => Boolean(url));
            return (
              <div key={applicant.applicant_id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.name}>{applicant.full_name || 'Unnamed applicant'}</span>
                  <span className={styles.appliedAt}>Applied {formatDate(applicant.applied_at)}</span>
                </div>
                <div className={styles.meta}>
                  {applicant.email && (
                    <a className={styles.metaLink} href={`mailto:${applicant.email}`}>
                      {applicant.email}
                    </a>
                  )}
                  {applicant.designation_name && (
                    <span className={styles.metaBadge}>
                      {applicant.designation_name}
                      {applicant.designation_seniority ? ` · ${applicant.designation_seniority}` : ''}
                    </span>
                  )}
                  {applicant.current_status && <span className={styles.metaBadge}>{applicant.current_status}</span>}
                </div>
                {applicant.skills && applicant.skills.length > 0 && (
                  <div className={styles.skills}>
                    {applicant.skills.map((skill) => (
                      <span key={skill} className={styles.skillTag}>
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                <div className={styles.actions}>
                  {applicant.resume_url && (
                    <a
                      className={styles.actionLink}
                      href={applicant.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Resume ↗
                    </a>
                  )}
                  {socialLinks.map(([key, url]) => (
                    <a key={key} className={styles.actionLink} href={url} target="_blank" rel="noopener noreferrer">
                      {key} ↗
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

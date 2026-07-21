'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import {
  listMyJobApplicants,
  countMyJobApplicants,
  setApplicantStatus,
  setApplicantNextAction,
} from '@/data/jobApplicants';
import PdfEmbed from '@/components/PdfEmbed';
import { CURRENT_STATUS_OPTIONS, NOTICE_PERIOD_OPTIONS } from '@/types/currentStatus';
import { EDUCATION_STATUS_OPTIONS } from '@/types/educationStatus';
import { LOOKING_FOR_OPTIONS } from '@/types/lookingFor';
import { SOCIAL_PLATFORM_OPTIONS } from '@/types/socialLinks';
import { SENIORITY_LEVEL_OPTIONS } from '@/types/seniority';
import { NEXT_ACTION_OPTIONS } from '@/types/nextAction';
import { formatCtc } from '@/utils/ctc';
import styles from './styles.module.css';

interface Applicant {
  applicant_id: string;
  full_name: string | null;
  email: string | null;
  bio: string | null;
  current_status: string | null;
  notice_period: string | null;
  looking_for: string[] | null;
  education_status: string | null;
  experience_years: number | null;
  experience_months: number | null;
  passing_year: number | null;
  resume_url: string | null;
  social_links: Record<string, string> | null;
  designation_id: string | null;
  designation_name: string | null;
  designation_seniority: string | null;
  category_domain_id: string | null;
  category_domain_name: string | null;
  category_role_id: string | null;
  category_role_name: string | null;
  current_location_id: string | null;
  current_location_name: string | null;
  current_location_state_name: string | null;
  open_to_state_names: string[] | null;
  skills: string[] | null;
  current_ctc: number | null;
  expected_ctc: number | null;
  job_id: string;
  job_title: string;
  company_name: string | null;
  applied_at: string;
  status: 'applied' | 'shortlisted' | 'not_fit';
  next_action: string | null;
}

interface JobApplicantsViewProps {
  status: 'applied' | 'shortlisted';
  jobId?: string | null;
}

const PAGE_SIZE = 8;

function rowKey(a: Applicant): string {
  return `${a.job_id}::${a.applicant_id}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function labelFor(options: { value: string; label: string }[], value: string | null): string | null {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? value;
}

function roleWithSeniorityLabel(a: Applicant): string | null {
  if (!a.category_role_name) return null;
  const seniorityLabel = labelFor(SENIORITY_LEVEL_OPTIONS, a.designation_seniority);
  return seniorityLabel ? `${a.category_role_name} · ${seniorityLabel}` : a.category_role_name;
}

function totalExperienceLabel(a: Applicant): string | null {
  if (a.education_status === 'experienced') {
    const years = a.experience_years ?? 0;
    const months = a.experience_months ?? 0;
    return `${years} yr${years === 1 ? '' : 's'} ${months} mo`;
  }
  if (a.education_status === 'passed_out' && a.passing_year != null) {
    return `Passed out ${a.passing_year}`;
  }
  return null;
}

export default function JobApplicantsView({ status, jobId }: JobApplicantsViewProps): React.JSX.Element {
  const { supabase } = useAuth();
  const { mutate } = useSWRConfig();
  const [movingId, setMovingId] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [editingNextAction, setEditingNextAction] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [status, jobId]);

  // Stale-while-revalidate, same as the Jobs feed: cached results render
  // instantly on tab switches while a fresh fetch runs quietly in the
  // background. Pagination and the job filter both happen server-side now
  // (get_my_job_applicants/count_my_job_applicants take p_job_id/p_page/
  // p_page_size), so each key only ever holds one page's worth of data
  // instead of every applicant the poster has ever received.
  const dataKey = supabase ? (['jobApplicants', status, jobId ?? '', page] as const) : null;
  const { data: applicantsResult, isLoading } = useSWR<Applicant[]>(dataKey, () =>
    listMyJobApplicants(supabase, status, { jobId, page, pageSize: PAGE_SIZE })
  );
  const applicants = useMemo(() => applicantsResult ?? [], [applicantsResult]);

  const countKey = supabase ? (['jobApplicantsCount', status, jobId ?? ''] as const) : null;
  const { data: totalCount = 0 } = useSWR<number>(countKey, () => countMyJobApplicants(supabase, status, jobId));
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    setSelectedKey((prev) =>
      applicants.some((a) => rowKey(a) === prev) ? prev : applicants[0] ? rowKey(applicants[0]) : null
    );
  }, [applicants]);

  useEffect(() => {
    setEditingNextAction(false);
  }, [selectedKey]);

  async function handleMove(applicant: Applicant, nextStatus: 'applied' | 'shortlisted' | 'not_fit'): Promise<void> {
    setMovingId(applicant.applicant_id);
    const { error } = await setApplicantStatus(supabase, applicant.job_id, applicant.applicant_id, nextStatus);
    if (!error && nextStatus === 'shortlisted') {
      await setApplicantNextAction(supabase, applicant.job_id, applicant.applicant_id, 'contact_candidate');
    }
    setMovingId(null);
    if (error) return;
    // Optimistic removal for instant feedback, then revalidate in the
    // background -- with server-side pagination the page needs a fresh
    // fetch anyway to pull in the next row and keep the count accurate.
    if (dataKey) mutate(dataKey, applicants.filter((a) => rowKey(a) !== rowKey(applicant)));
    if (countKey) mutate(countKey);
  }

  async function handleNextActionChange(applicant: Applicant, nextAction: string): Promise<void> {
    setEditingNextAction(false);
    const { error } = await setApplicantNextAction(supabase, applicant.job_id, applicant.applicant_id, nextAction);
    if (error) return;
    if (dataKey) {
      mutate(
        dataKey,
        applicants.map((a) => (rowKey(a) === rowKey(applicant) ? { ...a, next_action: nextAction } : a)),
        false
      );
    }
  }

  if (applicantsResult === undefined && isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading applicants...</p>
        </div>
      </div>
    );
  }

  if (applicants.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>{status === 'shortlisted' ? 'No shortlisted candidates yet.' : 'No applicants yet.'}</p>
        </div>
      </div>
    );
  }

  const selected = applicants.find((a) => rowKey(a) === selectedKey) ?? null;
  const socialLinks = selected ? Object.entries(selected.social_links ?? {}).filter(([, url]) => Boolean(url)) : [];
  const lookingForLabels = (selected?.looking_for ?? []).map((v) => labelFor(LOOKING_FOR_OPTIONS, v) ?? v);

  return (
    <div className={styles.container}>
      <div className={styles.split}>
        <div className={styles.listColumn}>
          <div className={styles.listPane}>
            {applicants.map((applicant) => {
              const key = rowKey(applicant);
              const moving = movingId === applicant.applicant_id;
              return (
                <button
                  key={key}
                  type="button"
                  className={clsx(styles.listItem, key === selectedKey && styles.listItemActive)}
                  onClick={() => setSelectedKey(key)}
                  disabled={moving}
                >
                  <div className={styles.listItemRow}>
                    <div className={styles.listItemLogoPlaceholder}>
                      {(applicant.full_name || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className={styles.listItemMain}>
                      <span className={styles.listItemTitle}>{applicant.full_name || 'Unnamed applicant'}</span>
                      <span className={styles.listItemCompany}>{roleWithSeniorityLabel(applicant) || 'Current role not set'}</span>
                    </div>
                    <span
                      className={applicant.status === 'shortlisted' ? styles.statusBadgeShortlisted : styles.statusBadgeApplied}
                    >
                      {applicant.status === 'shortlisted' ? 'Shortlisted' : 'Applied'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className={styles.paginationBar}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>

        <div className={styles.detailPane}>
          {selected && (
            <>
              <div className={styles.detailBanner}>
                <div className={styles.detailAvatarPlaceholder}>
                  {(selected.full_name || '?').slice(0, 1).toUpperCase()}
                </div>
                <div className={styles.detailBannerInfo}>
                  <h2 className={styles.detailTitle}>{selected.full_name || 'Unnamed applicant'}</h2>
                  <p className={styles.detailCompany}>
                    {selected.job_title}
                    <span
                      className={selected.status === 'shortlisted' ? styles.statusBadgeShortlisted : styles.statusBadgeApplied}
                    >
                      {selected.status === 'shortlisted' ? 'Shortlisted' : 'Applied'} · {formatDate(selected.applied_at)}
                    </span>
                  </p>
                  {selected.company_name && (
                    <p className={styles.detailSubCompany}>{selected.company_name}</p>
                  )}
                </div>
                <div className={styles.detailBannerActions}>
                  {selected.resume_url && (
                    <button type="button" className={styles.saveBtn} onClick={() => setIsResumeModalOpen(true)}>
                      Preview resume
                    </button>
                  )}
                  {status === 'applied' ? (
                    <>
                      <button
                        type="button"
                        className={styles.notFitBtn}
                        disabled={movingId === selected.applicant_id}
                        onClick={() => handleMove(selected, 'not_fit')}
                      >
                        Not fit
                      </button>
                      <button
                        type="button"
                        className={styles.shortlistBtn}
                        disabled={movingId === selected.applicant_id}
                        onClick={() => handleMove(selected, 'shortlisted')}
                      >
                        Shortlist
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.shortlistBtn}
                      disabled={movingId === selected.applicant_id}
                      onClick={() => handleMove(selected, 'applied')}
                    >
                      Move back to Applied
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.detailBody}>
                {status === 'shortlisted' && (
                  <div className={styles.sectionGroup}>
                    <div className={styles.factRow}>
                      <span className={styles.factLabel}>Next Action</span>
                      {editingNextAction ? (
                        <select
                          className={styles.factSelect}
                          autoFocus
                          value={selected.next_action ?? ''}
                          onChange={(e) => handleNextActionChange(selected, e.target.value)}
                          onBlur={() => setEditingNextAction(false)}
                        >
                          <option value="">Select next action…</option>
                          {NEXT_ACTION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          type="button"
                          className={styles.factValueEditable}
                          onClick={() => setEditingNextAction(true)}
                        >
                          {NEXT_ACTION_OPTIONS.find((o) => o.value === selected.next_action)?.label ??
                            'Select next action…'}
                          <span className={styles.factValueEditIcon}>✎</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {selected.bio && (
                  <div className={styles.sectionGroup}>
                    <span className={styles.sectionLabel}>About</span>
                    <p className={styles.bioText}>{selected.bio}</p>
                  </div>
                )}

                <div className={styles.sectionGroup}>
                  <span className={styles.sectionLabel}>Candidate Overview</span>
                  <div className={styles.factsGrid}>
                    <div className={styles.factRow}>
                      <span className={styles.factLabel}>Current Role and Designation</span>
                      <span className={styles.factValue}>{roleWithSeniorityLabel(selected) ?? '—'}</span>
                    </div>
                    <div className={styles.factRow}>
                      <span className={styles.factLabel}>Total Experience</span>
                      <span className={styles.factValue}>{totalExperienceLabel(selected) ?? '—'}</span>
                    </div>
                    <div className={styles.factRow}>
                      <span className={styles.factLabel}>Education Status & Experience</span>
                      <span className={styles.factValue}>{labelFor(EDUCATION_STATUS_OPTIONS, selected.education_status) ?? '—'}</span>
                    </div>
                    {selected.current_location_name && (
                      <div className={styles.factRow}>
                        <span className={styles.factLabel}>Current Location</span>
                        <span className={styles.factValue}>
                          {selected.current_location_state_name
                            ? `${selected.current_location_state_name} - ${selected.current_location_name}`
                            : selected.current_location_name}
                        </span>
                      </div>
                    )}
                    {(selected.open_to_state_names?.length ?? 0) > 0 && (
                      <div className={styles.factRow}>
                        <span className={styles.factLabel}>Open to</span>
                        <span className={styles.factValue}>{selected.open_to_state_names!.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.factsGrid}>
                    {Boolean(selected.current_ctc) && (
                      <div className={styles.factRow}>
                        <span className={styles.factLabel}>Current CTC</span>
                        <span className={styles.factValue}>{formatCtc(selected.current_ctc)}</span>
                      </div>
                    )}
                    <div className={styles.factRow}>
                      <span className={styles.factLabel}>Notice Period</span>
                      <span className={styles.factValue}>{labelFor(NOTICE_PERIOD_OPTIONS, selected.notice_period) ?? '—'}</span>
                    </div>
                    {Boolean(selected.expected_ctc) && (
                      <div className={styles.factRow}>
                        <span className={styles.factLabel}>Expected CTC</span>
                        <span className={styles.factValue}>{formatCtc(selected.expected_ctc)}</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.factsGrid}>
                    <div className={styles.factRow}>
                      <span className={styles.factLabel}>Current Status</span>
                      <span className={styles.factValue}>{labelFor(CURRENT_STATUS_OPTIONS, selected.current_status) ?? '—'}</span>
                    </div>
                    <div className={styles.factRow}>
                      <span className={styles.factLabel}>Looking For</span>
                      <span className={styles.factValue}>{lookingForLabels.length > 0 ? lookingForLabels.join(', ') : '—'}</span>
                    </div>
                  </div>
                </div>

                {selected.skills && selected.skills.length > 0 && (
                  <div className={styles.sectionGroup}>
                    <span className={styles.sectionLabel}>Skills</span>
                    <div className={styles.chipRow}>
                      {selected.skills.map((skill) => (
                        <span key={skill} className={styles.chip}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {socialLinks.length > 0 && (
                  <div className={styles.sectionGroup}>
                    <span className={styles.sectionLabel}>Social Links</span>
                    <div className={styles.chipRow}>
                      {socialLinks.map(([key, url]) => (
                        <a key={key} className={styles.chip} href={url} target="_blank" rel="noopener noreferrer">
                          {labelFor(SOCIAL_PLATFORM_OPTIONS, key) ?? key}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selected.resume_url && (
                  <div className={styles.sectionGroup}>
                    <span className={styles.sectionLabel}>Resume</span>
                    <div className={styles.chipRow}>
                      <button type="button" className={styles.saveBtn} onClick={() => setIsResumeModalOpen(true)}>
                        Preview
                      </button>
                      <a
                        className={styles.mailtoLink}
                        href={selected.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open in new tab ↗
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {isResumeModalOpen && selected?.resume_url && (
        <div className={styles.resumeModalOverlay} onClick={() => setIsResumeModalOpen(false)}>
          <div className={styles.resumeModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.resumeModalHeader}>
              <a
                className={styles.resumeModalIconBtn}
                href={selected.resume_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download resume"
              >
                ⬇
              </a>
              <button
                type="button"
                className={styles.resumeModalIconBtn}
                onClick={() => setIsResumeModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <PdfEmbed src={selected.resume_url} title="Resume" height={720} showCaption={false} />
          </div>
        </div>
      )}
    </div>
  );
}

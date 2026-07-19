'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import {
  listSignedInJobs,
  listAppliedJobIds,
  applyToJob,
  listSavedJobIds,
  saveJob,
  unsaveJob,
  countAvailableJobs,
} from '@/data/signedInJobs';
import { fetchTaxonomy } from '@/data/taxonomy';
import { WORK_MODE_LABEL } from '@/types/workMode';
import styles from './styles.module.css';

interface Branding {
  company_name: string;
  display_name: string | null;
  logo_url: string | null;
  tagline: string | null;
  about: string | null;
  employee_range: string | null;
  linkedin_url: string | null;
}

interface JobSkill {
  id: string;
  name: string;
}

interface SignedInJob {
  id: string;
  slug: string;
  title: string;
  description: string;
  company_name: string | null;
  location: string | null;
  employment_type: string | null;
  work_mode: string | null;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  apply_url: string | null;
  apply_email: string | null;
  include_branding: boolean;
  created_at: string;
  branding: Branding | null;
  category_domain_id: string | null;
  category_role_id: string | null;
  required_experience_years: number | null;
  required_experience_months: number | null;
  skills: JobSkill[];
}

interface TaxonomyCatalog {
  domains: { id: string; name: string; roleIds: string[]; skillIds: string[]; technologyIds: string[] }[];
  roles: { id: string; name: string }[];
  skills: { id: string; name: string }[];
  technologies: { id: string; name: string }[];
}

const PAGE_SIZE = 7;

type JobsTab = 'jobs' | 'saved' | 'applied';

const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  freelance: 'Freelance',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return formatDate(iso);
}

function employeeCountLabel(range: string | null): string | null {
  if (!range) return null;
  return `${range} employees`;
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')}`;
  if (min != null) return `₹${min.toLocaleString('en-IN')}+`;
  return `Up to ₹${max!.toLocaleString('en-IN')}`;
}

export default function JobsFeed(): React.JSX.Element {
  const { supabase, user, categoryDomainId } = useAuth();
  const { mutate } = useSWRConfig();
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<JobsTab>('jobs');
  const [employmentFilter, setEmploymentFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [page, setPage] = useState(1);

  // Stale-while-revalidate: cached results render instantly (no spinner) on
  // repeat visits/tab-switches while a fresh fetch runs quietly in the
  // background — same model browsers/CDNs use for HTTP caching, and what
  // most production feeds (Twitter, Facebook, Vercel's own dashboards) build
  // client data-fetching on. Each key encodes the exact query params, so
  // different tabs/filters/pages get independent cache entries.
  const { data: taxonomyCatalog } = useSWR<TaxonomyCatalog>('taxonomy', () =>
    fetchTaxonomy(process.env.NEXT_PUBLIC_API_BASE_URL) as Promise<TaxonomyCatalog>
  );

  const appliedKey = supabase && user?.id ? (['appliedJobIds', user.id] as const) : null;
  const { data: appliedIdsList = [] } = useSWR<string[]>(appliedKey, () => listAppliedJobIds(supabase, user!.id));
  const appliedIds = useMemo(() => new Set(appliedIdsList), [appliedIdsList]);

  const savedKey = supabase && user?.id ? (['savedJobIds', user.id] as const) : null;
  const { data: savedIdsList = [] } = useSWR<string[]>(savedKey, () => listSavedJobIds(supabase, user!.id));
  const savedIds = useMemo(() => new Set(savedIdsList), [savedIdsList]);

  const excludeForCount = useMemo(
    () => Array.from(new Set([...appliedIdsList, ...savedIdsList])).sort(),
    [appliedIdsList, savedIdsList]
  );
  const countKey = supabase ? (['availableJobsCount', excludeForCount.join(',')] as const) : null;
  const { data: jobsTabCount = 0 } = useSWR(countKey, () => countAvailableJobs(supabase, excludeForCount));

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const restrictToJobIds =
    activeTab === 'applied' ? appliedIdsList : activeTab === 'saved' ? savedIdsList.filter((id) => !appliedIds.has(id)) : null;
  const excludeJobIds = activeTab === 'jobs' ? excludeForCount : [];

  const jobsKey = supabase
    ? ([
        'signedInJobs',
        activeTab,
        activeTab === 'jobs' ? domainFilter : '',
        activeTab === 'jobs' ? employmentFilter : '',
        page,
        activeTab === 'jobs' ? categoryDomainId ?? '' : '',
        (restrictToJobIds ?? []).slice().sort().join(','),
        excludeJobIds.slice().sort().join(','),
      ] as const)
    : null;

  const { data: jobsResult, isLoading: jobsLoading } = useSWR<{ jobs: SignedInJob[]; totalCount: number }>(
    jobsKey,
    () =>
      listSignedInJobs(supabase, {
        domainId: activeTab === 'jobs' ? domainFilter || null : null,
        employmentType: activeTab === 'jobs' ? employmentFilter || null : null,
        restrictToJobIds,
        excludeJobIds,
        preferredDomainId: activeTab === 'jobs' ? categoryDomainId : null,
        page,
        pageSize: PAGE_SIZE,
      }),
    { keepPreviousData: true }
  );

  const jobs = useMemo(() => jobsResult?.jobs ?? [], [jobsResult]);
  const totalCount = jobsResult?.totalCount ?? 0;

  useEffect(() => {
    setSelectedId((prev) => (jobs.some((job) => job.id === prev) ? prev : jobs[0]?.id ?? null));
  }, [jobs]);

  function handleDomainFilterChange(domainId: string): void {
    setDomainFilter(domainId);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  async function handleApply(jobId: string): Promise<void> {
    setApplyingId(jobId);
    setError(null);
    const { error: applyError } = await applyToJob(supabase, jobId);
    setApplyingId(null);
    if (applyError) {
      setError(applyError);
      return;
    }
    if (appliedKey) mutate(appliedKey, [...appliedIdsList, jobId], false);
  }

  async function handleSaveToggle(jobId: string): Promise<void> {
    setSavingId(jobId);
    setError(null);
    const isSaved = savedIds.has(jobId);
    const { error: saveError } = isSaved ? await unsaveJob(supabase, jobId) : await saveJob(supabase, jobId);
    setSavingId(null);
    if (saveError) {
      setError(saveError);
      return;
    }
    if (savedKey) {
      const next = isSaved ? savedIdsList.filter((id) => id !== jobId) : [...savedIdsList, jobId];
      mutate(savedKey, next, false);
    }
  }

  if (jobsResult === undefined && jobsLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading jobs...</p>
        </div>
      </div>
    );
  }

  const selectedJob = jobs.find((job) => job.id === selectedId) ?? null;
  const employmentTypesInFeed = Object.keys(EMPLOYMENT_TYPE_LABEL);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <JobsIcon />
        </div>
        <div>
          <h1 className={styles.heading}>Jobs</h1>
          <p className={styles.subtitle}>Open roles from companies hiring on Sypher.</p>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.tabs}>
        <button
          type="button"
          className={activeTab === 'jobs' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setActiveTab('jobs')}
        >
          Jobs ({jobsTabCount})
        </button>
        <button
          type="button"
          className={activeTab === 'saved' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setActiveTab('saved')}
        >
          Saved For Later ({Array.from(savedIds).filter((id) => !appliedIds.has(id)).length})
        </button>
        <button
          type="button"
          className={activeTab === 'applied' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setActiveTab('applied')}
        >
          Applied ({appliedIds.size})
        </button>
      </div>

      {activeTab === 'jobs' && (
      <div className={styles.toolbar}>
            <select
              className={styles.filterSelect}
              value={domainFilter}
              onChange={(e) => handleDomainFilterChange(e.target.value)}
            >
              <option value="">All domains</option>
              {(taxonomyCatalog?.domains ?? []).map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={employmentFilter}
              onChange={(e) => {
                setEmploymentFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All employment types</option>
              {employmentTypesInFeed.map((type) => (
                <option key={type} value={type}>
                  {EMPLOYMENT_TYPE_LABEL[type] ?? type}
                </option>
              ))}
            </select>
          </div>
      )}

          {jobs.length === 0 ? (
            <div className={styles.emptyState}>
              <p>
                {activeTab === 'saved'
                  ? 'No saved jobs yet.'
                  : activeTab === 'applied'
                  ? "You haven't applied to any jobs yet."
                  : 'No jobs match your filters.'}
              </p>
            </div>
          ) : (
            <div className={styles.split}>
              <div className={styles.listColumn}>
                <div className={styles.listPane}>
                  {jobs.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      className={clsx(styles.listItem, job.id === selectedId && styles.listItemActive)}
                      onClick={() => setSelectedId(job.id)}
                    >
                      <div className={styles.listItemRow}>
                        {job.branding?.logo_url ? (
                          <img src={job.branding.logo_url} alt="" className={styles.listItemLogo} />
                        ) : (
                          <div className={styles.listItemLogoPlaceholder}>
                            {(job.company_name ?? '?').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className={styles.listItemMain}>
                          <span className={styles.listItemTitle}>{job.title}</span>
                          <span className={styles.listItemCompany}>{job.company_name}</span>
                        </div>
                        {appliedIds.has(job.id) && <span className={styles.appliedBadge}>Applied</span>}
                        {!appliedIds.has(job.id) && savedIds.has(job.id) && (
                          <span className={styles.savedBadge}>Saved</span>
                        )}
                      </div>
                      <div className={styles.listItemFooter}>
                        <span className={styles.listItemLocation}>
                          <LocationIcon className={styles.listItemFooterIcon} />
                          {job.location || 'Location not specified'}
                        </span>
                        <span className={styles.listItemDate}>
                          <ClockIcon className={styles.listItemFooterIcon} />
                          Posted {formatRelativeDate(job.created_at)}
                        </span>
                      </div>
                    </button>
                  ))}
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
                {selectedJob && (
                  <>
                    <div className={styles.detailBanner}>
                      {selectedJob.branding?.logo_url ? (
                        <img src={selectedJob.branding.logo_url} alt="" className={styles.detailAvatar} />
                      ) : (
                        <div className={styles.detailAvatarPlaceholder}>
                          {(selectedJob.company_name ?? '?').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className={styles.detailBannerInfo}>
                        <h2 className={styles.detailTitle}>{selectedJob.title}</h2>
                        <p className={styles.detailCompany}>
                          {selectedJob.company_name}
                          {employeeCountLabel(selectedJob.branding?.employee_range ?? null) && (
                            <span className={styles.detailEmployeeCount}>
                              <UsersIcon className={styles.factIcon} />
                              {employeeCountLabel(selectedJob.branding?.employee_range ?? null)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className={styles.detailBannerActions}>
                        {!appliedIds.has(selectedJob.id) && (
                          <button
                            type="button"
                            className={clsx(styles.saveBtn, savedIds.has(selectedJob.id) && styles.saveBtnActive)}
                            onClick={() => handleSaveToggle(selectedJob.id)}
                            disabled={savingId === selectedJob.id}
                          >
                            <BookmarkIcon className={styles.factIcon} filled={savedIds.has(selectedJob.id)} />
                            {savedIds.has(selectedJob.id) ? 'Saved' : 'Save'}
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.applyBtn}
                          onClick={() => handleApply(selectedJob.id)}
                          disabled={appliedIds.has(selectedJob.id) || applyingId === selectedJob.id}
                        >
                          {appliedIds.has(selectedJob.id)
                            ? 'Applied'
                            : applyingId === selectedJob.id
                            ? 'Applying...'
                            : 'Apply'}
                        </button>
                      </div>
                    </div>
                    <div className={styles.detailBody}>
                      {formatSalary(selectedJob.salary_min, selectedJob.salary_max) && (
                        <div className={styles.cardMeta}>
                          <span className={styles.metaBadge}>
                            {formatSalary(selectedJob.salary_min, selectedJob.salary_max)}
                          </span>
                        </div>
                      )}
                      <div className={styles.factsList}>
                        {selectedJob.category_domain_id && (
                          <div className={styles.factRow}>
                            <span className={styles.factLabel}>Domain</span>
                            <span className={styles.factValue}>
                              {taxonomyCatalog?.domains.find((d) => d.id === selectedJob.category_domain_id)?.name ?? 'Domain'}
                            </span>
                          </div>
                        )}
                        {selectedJob.category_role_id && (
                          <div className={styles.factRow}>
                            <span className={styles.factLabel}>Role</span>
                            <span className={styles.factValue}>
                              {taxonomyCatalog?.roles.find((r) => r.id === selectedJob.category_role_id)?.name ?? 'Role'}
                            </span>
                          </div>
                        )}
                        {selectedJob.location && (
                          <div className={styles.factRow}>
                            <span className={styles.factLabel}>Location</span>
                            <span className={styles.factValue}>{selectedJob.location}</span>
                          </div>
                        )}
                        {selectedJob.employment_type && (
                          <div className={styles.factRow}>
                            <span className={styles.factLabel}>Employment Type</span>
                            <span className={styles.factValue}>
                              {EMPLOYMENT_TYPE_LABEL[selectedJob.employment_type] ?? selectedJob.employment_type}
                            </span>
                          </div>
                        )}
                        {selectedJob.work_mode && (
                          <div className={styles.factRow}>
                            <span className={styles.factLabel}>Work Mode</span>
                            <span className={styles.factValue}>
                              {WORK_MODE_LABEL[selectedJob.work_mode] ?? selectedJob.work_mode}
                            </span>
                          </div>
                        )}
                        {(selectedJob.required_experience_years != null || selectedJob.required_experience_months != null) && (
                          <div className={styles.factRow}>
                            <span className={styles.factLabel}>Total Experience</span>
                            <span className={styles.factValue}>
                              {selectedJob.required_experience_years ?? 0} yrs {selectedJob.required_experience_months ?? 0} mo
                            </span>
                          </div>
                        )}
                        {selectedJob.skills.length > 0 && (
                          <div className={styles.factRow}>
                            <span className={styles.factLabel}>Skills Required</span>
                            <div className={styles.skillChipRow}>
                              {selectedJob.skills.map((skill) => (
                                <span key={skill.id} className={styles.skillChip}>
                                  {skill.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <p className={styles.detailDescription}>{selectedJob.description}</p>
                      {selectedJob.branding && (
                        <div className={styles.brandingStrip}>
                          <div className={styles.brandingHeader}>
                            <div className={styles.brandingInfo}>
                              <p className={styles.brandingName}>
                                {selectedJob.branding.display_name || selectedJob.company_name}
                              </p>
                              {selectedJob.branding.tagline && (
                                <p className={styles.brandingTagline}>{selectedJob.branding.tagline}</p>
                              )}
                            </div>
                          </div>
                          {selectedJob.branding.about && (
                            <p className={styles.aboutText}>{selectedJob.branding.about}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
    </div>
  );
}

function JobsIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function BookmarkIcon({
  className,
  filled,
}: {
  className?: string;
  filled?: boolean;
}): React.JSX.Element {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function LocationIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      className={className}
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      className={className}
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}


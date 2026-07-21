'use client';

import React, { useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useUpgradeToPaid } from '@/hooks/useUpgradeToPaid';
import { updateOwnBio } from '@/data/profiles';
import { uploadToBunny } from '@/data/bunnyUpload';
import PdfEmbed from '@/components/PdfEmbed';
import { LOOKING_FOR_OPTIONS } from '@/types/lookingFor';
import type { LookingFor } from '@/types/lookingFor';
import { EDUCATION_STATUS_OPTIONS, EXPERIENCE_YEARS_OPTIONS, EXPERIENCE_MONTHS_OPTIONS, PASSING_YEAR_OPTIONS } from '@/types/educationStatus';
import type { EducationStatus } from '@/types/educationStatus';
import { CURRENT_STATUS_OPTIONS, NOTICE_PERIOD_OPTIONS } from '@/types/currentStatus';
import type { CurrentStatus, NoticePeriod } from '@/types/currentStatus';
import { SOCIAL_PLATFORM_OPTIONS } from '@/types/socialLinks';
import type { SocialLinks } from '@/types/socialLinks';
import { fetchTaxonomy } from '@/data/taxonomy';
import { getOwnSkills, setOwnSkills, setOwnDesignation, setOwnCtc } from '@/data/userTaxonomy';
import { SENIORITY_LEVEL_OPTIONS } from '@/types/seniority';
import type { SeniorityLevel } from '@/types/seniority';
import { fetchLocations } from '@/data/locations';
import { getOwnOpenToLocations, setOwnOpenToLocations, setOwnLocationAndCategory } from '@/data/userLocations';
import SkillsModal from '@/components/SkillsModal';
import EmptySection from '@/components/EmptySection';
import InsiderProfileSection from '@/components/InsiderProfileSection';
import { FULL_DASHBOARD_ROLES } from '@/types/roles';
import { ProfileIcon } from '@/components/NavIcons';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import styles from './profile.module.css';

const BUNNY_CONFIG = {
  bunnyStorageZone: process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE,
  bunnyStorageAccessKey: process.env.NEXT_PUBLIC_BUNNY_STORAGE_ACCESS_KEY,
  bunnyStorageHostname: process.env.NEXT_PUBLIC_BUNNY_STORAGE_HOSTNAME,
  bunnyPullZoneUrl: process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL,
};

const BIO_WORD_LIMIT = 250;

interface TaxonomyCatalog {
  domains: { id: string; name: string; roleIds: string[]; skillIds: string[]; technologyIds: string[] }[];
  roles: { id: string; name: string }[];
  skills: { id: string; name: string }[];
  technologies: { id: string; name: string }[];
}

interface LocationsCatalog {
  states: { id: string; name: string; slug: string; locationIds: string[] }[];
  locations: { id: string; name: string; slug: string; stateId: string }[];
}

interface SkillRow {
  skill_id: string;
}

type AboutSection =
  | 'bio'
  | 'resume'
  | 'status'
  | 'currentRole'
  | 'compensation'
  | 'skills'
  | 'currentLocation'
  | 'openToLocation'
  | 'socialLinks';

const ALL_SECTIONS_EXPANDED: Record<AboutSection, boolean> = {
  bio: true,
  resume: true,
  status: true,
  currentRole: true,
  compensation: true,
  skills: true,
  currentLocation: true,
  openToLocation: true,
  socialLinks: true,
};

function SectionHeader({
  label,
  expanded,
  onToggle,
  extra,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  extra?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className={styles.sectionHeaderRow}>
      <div className={styles.sectionHeaderLeft}>
        <span className={styles.sectionLabel}>{label}</span>
        {extra}
      </div>
      <button
        type="button"
        className={
          expanded ? styles.collapseToggleBtn : `${styles.collapseToggleBtn} ${styles.collapseToggleBtnCollapsed}`
        }
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? `Collapse ${label.toLowerCase()}` : `Expand ${label.toLowerCase()}`}
        title={expanded ? 'Collapse' : 'Expand'}
      >
        <ExpandMoreRoundedIcon className={styles.collapseToggleIcon} fontSize="small" />
      </button>
    </div>
  );
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function formatPrice(pricePaise: string | undefined): string | null {
  if (!pricePaise || pricePaise === 'REPLACE-ME') return null;
  const rupees = Number(pricePaise) / 100;
  return rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}

const EXPIRING_SOON_DAYS = 30;

function isExpiringSoon(paidUntil: string): boolean {
  const daysLeft = (new Date(paidUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return daysLeft <= EXPIRING_SOON_DAYS;
}

// Free/paid users and branders get the full candidate-profile editor below.
// Everyone else (admin, HR roles, company_employees, external_job_poster)
// gets EmptyProfileSection instead -- see FULL_DASHBOARD_ROLES.
function LearnerProfileContent(): React.JSX.Element {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const paidUpgradePriceInrPaise = process.env.NEXT_PUBLIC_PAID_UPGRADE_PRICE_INR_PAISE;

  const {
    supabase,
    session,
    role,
    paidUntil,
    bio,
    currentStatus,
    noticePeriod,
    lookingFor,
    educationStatus,
    experienceYears,
    experienceMonths,
    passingYear,
    resumeUrl,
    socialLinks,
    categoryDomainId,
    categoryRoleId,
    designationSeniority,
    currentLocationId,
    currentCtc,
    expectedCtc,
    refreshProfile,
  } = useAuth();
  const { handleUpgrade, isProcessing, errorMessage } = useUpgradeToPaid();

  const [bioInput, setBioInput] = useState('');
  const [currentStatusInput, setCurrentStatusInput] = useState<CurrentStatus | null>(null);
  const [noticePeriodInput, setNoticePeriodInput] = useState<NoticePeriod | null>(null);
  const [lookingForInput, setLookingForInput] = useState<LookingFor[]>([]);
  const [educationStatusInput, setEducationStatusInput] = useState<EducationStatus | null>(null);
  const [experienceYearsInput, setExperienceYearsInput] = useState<number | null>(null);
  const [experienceMonthsInput, setExperienceMonthsInput] = useState<number | null>(null);
  const [passingYearInput, setPassingYearInput] = useState<number | null>(null);
  const [socialLinksInput, setSocialLinksInput] = useState<SocialLinks>({});
  const [expandedSections, setExpandedSections] = useState<Record<AboutSection, boolean>>(
    ALL_SECTIONS_EXPANDED
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  const [taxonomyCatalog, setTaxonomyCatalog] = useState<TaxonomyCatalog | null>(null);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);

  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);

  const [locationsCatalog, setLocationsCatalog] = useState<LocationsCatalog | null>(null);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  const [categoryDomainInput, setCategoryDomainInput] = useState('');
  const [categoryRoleInput, setCategoryRoleInput] = useState('');
  const [designationSeniorityInput, setDesignationSeniorityInput] = useState<SeniorityLevel | null>(null);
  const [currentCtcInput, setCurrentCtcInput] = useState('');
  const [expectedCtcInput, setExpectedCtcInput] = useState('');
  const [currentStateId, setCurrentStateId] = useState('');
  const [currentLocationInput, setCurrentLocationInput] = useState('');
  const [openToLocationPicks, setOpenToLocationPicks] = useState<string[]>([]);
  const [openToLocationStateId, setOpenToLocationStateId] = useState('');
  const [openToLocationToAdd, setOpenToLocationToAdd] = useState('');

  useEffect(() => {
    setBioInput(bio ?? '');
  }, [bio]);

  useEffect(() => {
    setCurrentStatusInput(currentStatus ?? null);
  }, [currentStatus]);

  useEffect(() => {
    setNoticePeriodInput(noticePeriod ?? null);
  }, [noticePeriod]);

  useEffect(() => {
    setLookingForInput(lookingFor ?? []);
  }, [lookingFor]);

  useEffect(() => {
    setEducationStatusInput(educationStatus ?? null);
  }, [educationStatus]);

  useEffect(() => {
    setExperienceYearsInput(experienceYears ?? null);
  }, [experienceYears]);

  useEffect(() => {
    setExperienceMonthsInput(experienceMonths ?? null);
  }, [experienceMonths]);

  useEffect(() => {
    setPassingYearInput(passingYear ?? null);
  }, [passingYear]);

  useEffect(() => {
    setSocialLinksInput(socialLinks ?? {});
  }, [socialLinks]);

  useEffect(() => {
    let active = true;
    fetchTaxonomy(apiBaseUrl)
      .then((data) => {
        if (active) setTaxonomyCatalog(data as TaxonomyCatalog);
      })
      .catch((err) => {
        if (active) setTaxonomyError(err instanceof Error ? err.message : 'Failed to load skills catalog');
      });
    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!supabase || !session?.user.id) return;
    getOwnSkills(supabase, session.user.id).then((rows: SkillRow[]) =>
      setSelectedSkillIds(rows.map((r) => r.skill_id))
    );
    getOwnOpenToLocations(supabase, session.user.id).then((rows: { location_id: string }[]) =>
      setOpenToLocationPicks(rows.map((r) => r.location_id))
    );
  }, [supabase, session?.user.id]);

  useEffect(() => {
    let active = true;
    fetchLocations(apiBaseUrl)
      .then((data) => {
        if (active) setLocationsCatalog(data as LocationsCatalog);
      })
      .catch((err) => {
        if (active) setLocationsError(err instanceof Error ? err.message : 'Failed to load locations catalog');
      });
    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    setCategoryDomainInput(categoryDomainId ?? '');
    setCategoryRoleInput(categoryRoleId ?? '');
  }, [categoryDomainId, categoryRoleId]);

  useEffect(() => {
    setDesignationSeniorityInput(designationSeniority ?? null);
  }, [designationSeniority]);

  useEffect(() => {
    setCurrentCtcInput(currentCtc != null ? String(currentCtc) : '');
  }, [currentCtc]);

  useEffect(() => {
    setExpectedCtcInput(expectedCtc != null ? String(expectedCtc) : '');
  }, [expectedCtc]);

  useEffect(() => {
    setCurrentLocationInput(currentLocationId ?? '');
    if (locationsCatalog && currentLocationId) {
      const location = locationsCatalog.locations.find((l) => l.id === currentLocationId);
      if (location) setCurrentStateId(location.stateId);
    }
  }, [currentLocationId, locationsCatalog]);

  function toggleLookingFor(value: LookingFor): void {
    setLookingForInput((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function handleEducationStatusChange(value: EducationStatus): void {
    setEducationStatusInput(value);
    if (value !== 'experienced') {
      setExperienceYearsInput(null);
      setExperienceMonthsInput(null);
    }
    if (value === 'passed_out') {
      setPassingYearInput((prev) => prev ?? new Date().getFullYear() - 1);
    } else {
      setPassingYearInput(null);
    }
  }

  function handleSocialLinkChange(platform: keyof SocialLinks, url: string): void {
    setSocialLinksInput((prev) => ({ ...prev, [platform]: url }));
  }

  function toggleSection(key: AboutSection): void {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const selectedCategoryDomain = taxonomyCatalog?.domains.find((d) => d.id === categoryDomainInput) ?? null;
  const rolesForSelectedCategoryDomain = selectedCategoryDomain
    ? taxonomyCatalog!.roles.filter((r) => selectedCategoryDomain.roleIds.includes(r.id))
    : [];

  function handleCategoryDomainChange(domainId: string): void {
    setCategoryDomainInput(domainId);
    setCategoryRoleInput('');
  }

  function handleCategoryRoleChange(roleId: string): void {
    setCategoryRoleInput(roleId);
  }

  function handleDesignationSeniorityChange(value: string): void {
    setDesignationSeniorityInput(value ? (value as SeniorityLevel) : null);
  }

  const skillsForCurrentDomain = selectedCategoryDomain
    ? (taxonomyCatalog?.skills ?? []).filter((s) => selectedCategoryDomain.skillIds.includes(s.id))
    : [];

  const locationsForCurrentState = (locationsCatalog?.locations ?? []).filter(
    (l) => l.stateId === currentStateId
  );
  const locationsForOpenToLocationState = (locationsCatalog?.locations ?? []).filter(
    (l) => l.stateId === openToLocationStateId
  );

  function handleCurrentStateChange(stateId: string): void {
    setCurrentStateId(stateId);
    setCurrentLocationInput('');
  }

  function handleOpenToLocationStateChange(stateId: string): void {
    setOpenToLocationStateId(stateId);
    setOpenToLocationToAdd('');
  }

  function addOpenToLocationPick(): void {
    if (!openToLocationToAdd) return;
    setOpenToLocationPicks((prev) => [...prev, openToLocationToAdd]);
    setOpenToLocationToAdd('');
  }

  function removeOpenToLocationPick(index: number): void {
    setOpenToLocationPicks((prev) => prev.filter((_, i) => i !== index));
  }

  const bioWordCount = countWords(bioInput);
  const isBioOverLimit = bioWordCount > BIO_WORD_LIMIT;

  async function handleSaveProfile(): Promise<void> {
    if (!session?.user.id || isBioOverLimit) return;
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      const results = await Promise.all([
        updateOwnBio(
          supabase,
          bioInput.trim(),
          lookingForInput,
          undefined,
          educationStatusInput,
          experienceYearsInput,
          currentStatusInput,
          noticePeriodInput,
          passingYearInput,
          socialLinksInput,
          experienceMonthsInput
        ),
        setOwnLocationAndCategory(
          supabase,
          categoryDomainInput || null,
          categoryRoleInput || null,
          currentLocationInput || null
        ),
        setOwnOpenToLocations(supabase, session.user.id, openToLocationPicks),
        categoryRoleInput
          ? setOwnDesignation(supabase, categoryRoleInput, designationSeniorityInput)
          : Promise.resolve({ error: null }),
        setOwnCtc(
          supabase,
          currentCtcInput.trim() ? Number(currentCtcInput) : 0,
          expectedCtcInput.trim() ? Number(expectedCtcInput) : 0
        ),
        setOwnSkills(
          supabase,
          session.user.id,
          selectedSkillIds.map((skillId) => ({
            skillId,
            proficiency: null,
            yearsExperience: null,
          }))
        ),
      ]);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) {
        setSaveError(firstError);
      } else {
        setSaveSuccess(true);
        await refreshProfile();
      }
    } finally {
      setIsSaving(false);
    }
  }

  // Switching browser tabs can trigger a Supabase auth event that re-syncs
  // form state from the last-saved profile, clearing any unsaved edits.
  // Auto-saving right as the tab is hidden means there's nothing left to
  // lose by the time that happens.
  const handleSaveProfileRef = useRef(handleSaveProfile);
  handleSaveProfileRef.current = handleSaveProfile;

  useEffect(() => {
    function handleVisibilityChange(): void {
      if (document.hidden) {
        handleSaveProfileRef.current();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  async function handleResumeChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !session?.user.id) return;
    if (file.type !== 'application/pdf') {
      setResumeError('Resume must be a PDF file.');
      return;
    }
    setResumeError(null);
    setIsUploadingResume(true);
    try {
      const url = await uploadToBunny(file, `resume/${session.user.id}`, BUNNY_CONFIG);
      const { error } = await updateOwnBio(
        supabase,
        bioInput.trim(),
        lookingForInput,
        url,
        educationStatusInput,
        experienceYearsInput,
        currentStatusInput,
        noticePeriodInput,
        passingYearInput,
        socialLinksInput,
        experienceMonthsInput
      );
      if (error) {
        setResumeError(error);
      } else {
        await refreshProfile();
      }
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : 'Failed to upload resume.');
    } finally {
      setIsUploadingResume(false);
    }
  }

  // Client-side treats a past paid_until as expired regardless of `role`
  // — the daily cron may not have caught up yet.
  const isPaidAndActive = role === 'paid_users' && !!paidUntil && new Date(paidUntil) > new Date();
  const priceLabel = formatPrice(paidUpgradePriceInrPaise);
  // Renewing early is a no-op worth hiding — extend_paid_until is additive,
  // so a renewal 300 days out wouldn't do anything a user would notice.
  const showUpgradeButton = !isPaidAndActive || (!!paidUntil && isExpiringSoon(paidUntil));

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIcon}>
                <ProfileIcon />
              </div>
              <div>
                <h1 className={styles.heading}>Profile</h1>
                <p className={styles.subtitle}>Manage your account details and preferences.</p>
              </div>
            </div>
            {showUpgradeButton ? (
              <button
                type="button"
                className={styles.upgradeBtn}
                disabled={isProcessing}
                onClick={handleUpgrade}
              >
                {isProcessing
                  ? 'Processing…'
                  : isPaidAndActive
                    ? 'Renew'
                    : priceLabel
                      ? `Upgrade to Paid — ₹${priceLabel}/year`
                      : 'Upgrade to Paid'}
              </button>
            ) : null}
          </div>
          <div className={styles.planRow}>
            <span className={`${styles.statusBadge} ${isPaidAndActive ? styles.statusPaid : styles.statusFree}`}>
              {isPaidAndActive ? 'Paid plan' : 'Free plan'}
            </span>
            {isPaidAndActive && paidUntil ? (
              <p className={styles.expiry}>
                Expires {formatDate(paidUntil)}
                {isExpiringSoon(paidUntil) ? (
                  <span className={`${styles.statusBadge} ${styles.statusFree}`} style={{ marginLeft: '0.5rem' }}>
                    Expiring soon
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
        </div>

        <div className={styles.mainPanel}>
          <div className={styles.card}>
            <div className={styles.sectionCard}>
              <SectionHeader
                label="About me"
                expanded={expandedSections.bio}
                onToggle={() => toggleSection('bio')}
                extra={
                  <span className={isBioOverLimit ? styles.wordCountOver : styles.wordCount}>
                    {bioWordCount}/{BIO_WORD_LIMIT} words
                  </span>
                }
              />
              {expandedSections.bio ? (
                <textarea
                  id="profile-bio"
                  className={styles.formTextarea}
                  rows={4}
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="Tell us a bit about yourself…"
                />
              ) : null}
            </div>

            <div className={styles.sectionCard}>
              <SectionHeader label="Resume" expanded={expandedSections.resume} onToggle={() => toggleSection('resume')} />
              {expandedSections.resume ? (
                <>
                  <div className={styles.resumeRow}>
                    {resumeUrl ? (
                      <button
                        type="button"
                        className={styles.resumeIconBtn}
                        onClick={() => setIsResumeModalOpen(true)}
                        aria-label="View resume"
                        title="View resume"
                      >
                        <svg viewBox="0 0 24 24" width="52" height="52" aria-hidden="true">
                          <path
                            d="M6 2h8l5 5v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
                            fill="#f1f5f9"
                            stroke="#94a3b8"
                            strokeWidth="1"
                          />
                          <path d="M14 2v5h5z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
                          <text x="12" y="14" fontSize="5" fontWeight="700" textAnchor="middle" dominantBaseline="middle" fill="#c53030">
                            PDF
                          </text>
                        </svg>
                      </button>
                    ) : null}
                    <label className={styles.resumeUploadBtn}>
                      {isUploadingResume ? 'Uploading…' : resumeUrl ? 'Replace resume (PDF)' : 'Upload resume (PDF)'}
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleResumeChange}
                        disabled={isUploadingResume}
                        hidden
                      />
                    </label>
                  </div>
                  {resumeError ? <p className={styles.errorMessage}>{resumeError}</p> : null}
                </>
              ) : null}
            </div>

            <div className={styles.sectionCard}>
              <SectionHeader
                label="Status & Availability"
                expanded={expandedSections.status}
                onToggle={() => toggleSection('status')}
              />
              {expandedSections.status ? (
                <div className={styles.sectionGroup}>
                  <div className={styles.formField}>
                    <span className={styles.formLabel}>Current Status</span>
                    <div className={styles.radioGroup}>
                      {CURRENT_STATUS_OPTIONS.map((option) => (
                        <label key={option.value} className={styles.radioOption}>
                          <input
                            type="radio"
                            name="current-status"
                            value={option.value}
                            checked={currentStatusInput === option.value}
                            onChange={() => setCurrentStatusInput(option.value)}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={styles.formField}>
                    <span className={styles.formLabel}>Notice Period</span>
                    <div className={styles.radioGroup}>
                      {NOTICE_PERIOD_OPTIONS.map((option) => (
                        <label key={option.value} className={styles.radioOption}>
                          <input
                            type="radio"
                            name="notice-period"
                            value={option.value}
                            checked={noticePeriodInput === option.value}
                            onChange={() => setNoticePeriodInput(option.value)}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={styles.formField}>
                    <span className={styles.formLabel}>Looking for</span>
                    <div className={styles.radioGroup}>
                      {LOOKING_FOR_OPTIONS.map((option) => (
                        <label key={option.value} className={styles.radioOption}>
                          <input
                            type="checkbox"
                            value={option.value}
                            checked={lookingForInput.includes(option.value)}
                            onChange={() => toggleLookingFor(option.value)}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={styles.formField}>
                    <span className={styles.formLabel}>Status</span>
                    <div className={styles.radioGroup}>
                      {EDUCATION_STATUS_OPTIONS.map((option) => (
                        <label key={option.value} className={styles.radioOption}>
                          <input
                            type="radio"
                            name="education-status"
                            value={option.value}
                            checked={educationStatusInput === option.value}
                            onChange={() => handleEducationStatusChange(option.value)}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {educationStatusInput === 'experienced' ? (
                    <div className={styles.formField}>
                      <span className={styles.formLabel}>Total Experience</span>
                      <div className={styles.cascadeRow}>
                        <select
                          id="profile-experience-years"
                          className={styles.formSelect}
                          value={experienceYearsInput ?? ''}
                          onChange={(e) => setExperienceYearsInput(e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">Years…</option>
                          {EXPERIENCE_YEARS_OPTIONS.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                        <select
                          id="profile-experience-months"
                          className={styles.formSelect}
                          value={experienceMonthsInput ?? ''}
                          onChange={(e) => setExperienceMonthsInput(e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">Months…</option>
                          {EXPERIENCE_MONTHS_OPTIONS.map((month) => (
                            <option key={month} value={month}>
                              {month}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : null}

                  {educationStatusInput === 'passed_out' ? (
                    <div className={styles.formField}>
                      <label className={styles.formLabel} htmlFor="profile-passing-year">
                        Year of Passing Out
                      </label>
                      <select
                        id="profile-passing-year"
                        className={styles.formSelect}
                        value={passingYearInput ?? ''}
                        onChange={(e) => setPassingYearInput(e.target.value ? Number(e.target.value) : null)}
                      >
                        {PASSING_YEAR_OPTIONS.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className={styles.sectionCard}>
              <SectionHeader
                label="Current Role"
                expanded={expandedSections.currentRole}
                onToggle={() => toggleSection('currentRole')}
              />
              {expandedSections.currentRole ? (
                <>
                  <div className={styles.cascadeRow}>
                    <select
                      className={styles.formSelect}
                      value={categoryDomainInput}
                      onChange={(e) => handleCategoryDomainChange(e.target.value)}
                    >
                      <option value="">Select a domain…</option>
                      {(taxonomyCatalog?.domains ?? []).map((domain) => (
                        <option key={domain.id} value={domain.id}>
                          {domain.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={styles.formSelect}
                      value={categoryRoleInput}
                      onChange={(e) => handleCategoryRoleChange(e.target.value)}
                      disabled={!categoryDomainInput}
                    >
                      <option value="">Select a role…</option>
                      {rolesForSelectedCategoryDomain.map((role_) => (
                        <option key={role_.id} value={role_.id}>
                          {role_.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={styles.formSelect}
                      value={designationSeniorityInput ?? ''}
                      onChange={(e) => handleDesignationSeniorityChange(e.target.value)}
                      disabled={!categoryRoleInput}
                    >
                      <option value="">Select seniority…</option>
                      {SENIORITY_LEVEL_OPTIONS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {taxonomyError ? <p className={styles.errorMessage}>{taxonomyError}</p> : null}
                </>
              ) : null}
            </div>

            <div className={styles.sectionCard}>
              <SectionHeader
                label="Compensation"
                expanded={expandedSections.compensation}
                onToggle={() => toggleSection('compensation')}
              />
              {expandedSections.compensation ? (
                <div className={styles.cascadeRow}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="profile-current-ctc">
                      Current CTC (lacs per annum)
                    </label>
                    <input
                      id="profile-current-ctc"
                      type="number"
                      step="0.01"
                      min="0"
                      className={styles.formInput}
                      value={currentCtcInput}
                      onChange={(e) => setCurrentCtcInput(e.target.value)}
                      placeholder="30.02"
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="profile-expected-ctc">
                      Expected CTC (lacs per annum)
                    </label>
                    <input
                      id="profile-expected-ctc"
                      type="number"
                      step="0.01"
                      min="0"
                      className={styles.formInput}
                      value={expectedCtcInput}
                      onChange={(e) => setExpectedCtcInput(e.target.value)}
                      placeholder="35.00"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className={styles.sectionCard}>
              <SectionHeader
                label="Skills"
                expanded={expandedSections.skills}
                onToggle={() => toggleSection('skills')}
              />
              {expandedSections.skills ? (
                <div className={styles.formField}>
                  <button
                    type="button"
                    className={styles.addItemBtn}
                    onClick={() => setIsSkillsModalOpen(true)}
                  >
                    Skills
                  </button>
                  {selectedSkillIds.length > 0 ? (
                    <div className={styles.skillChipRow}>
                      {selectedSkillIds.map((skillId) => {
                        const skill = taxonomyCatalog?.skills.find((s) => s.id === skillId);
                        return (
                          <span key={skillId} className={styles.skillChip}>
                            {skill?.name ?? skillId}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className={styles.helpText}>No skills selected yet.</p>
                  )}
                </div>
              ) : null}
            </div>

            <div className={styles.sectionCard}>
              <SectionHeader
                label="Current Location"
                expanded={expandedSections.currentLocation}
                onToggle={() => toggleSection('currentLocation')}
              />
              {expandedSections.currentLocation ? (
                <>
                  <div className={styles.cascadeRow}>
                    <select
                      className={styles.formSelect}
                      value={currentStateId}
                      onChange={(e) => handleCurrentStateChange(e.target.value)}
                    >
                      <option value="">Select a state</option>
                      {(locationsCatalog?.states ?? []).map((state) => (
                        <option key={state.id} value={state.id}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={styles.formSelect}
                      value={currentLocationInput}
                      onChange={(e) => setCurrentLocationInput(e.target.value)}
                      disabled={!currentStateId}
                    >
                      <option value="">Select a location</option>
                      {locationsForCurrentState.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {locationsError ? <p className={styles.errorMessage}>{locationsError}</p> : null}
                </>
              ) : null}
            </div>

            <div className={styles.sectionCard}>
              <SectionHeader
                label="Open to Location"
                expanded={expandedSections.openToLocation}
                onToggle={() => toggleSection('openToLocation')}
              />
              {expandedSections.openToLocation ? (
                <>
                  {openToLocationPicks.map((locationId, index) => {
                    const location = locationsCatalog?.locations.find((l) => l.id === locationId);
                    const state = locationsCatalog?.states.find((s) => s.id === location?.stateId);
                    const label = location
                      ? state
                        ? `${state.name} — ${location.name}`
                        : location.name
                      : locationId;
                    return (
                      <div key={`${locationId}-${index}`} className={styles.pickRow}>
                        <span className={styles.pickName}>{label}</span>
                        <button
                          type="button"
                          className={styles.pickRemoveBtn}
                          onClick={() => removeOpenToLocationPick(index)}
                          aria-label={`Remove ${location?.name ?? 'location'}`}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </button>
                      </div>
                    );
                  })}
                  <div className={styles.cascadeRow}>
                    <select
                      className={styles.formSelect}
                      value={openToLocationStateId}
                      onChange={(e) => handleOpenToLocationStateChange(e.target.value)}
                    >
                      <option value="">Select a state</option>
                      {(locationsCatalog?.states ?? []).map((state) => (
                        <option key={state.id} value={state.id}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={styles.formSelect}
                      value={openToLocationToAdd}
                      onChange={(e) => setOpenToLocationToAdd(e.target.value)}
                      disabled={!openToLocationStateId}
                    >
                      <option value="">Select a location</option>
                      {locationsForOpenToLocationState.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={styles.addItemBtn}
                      disabled={!openToLocationToAdd}
                      onClick={addOpenToLocationPick}
                    >
                      Add
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            <div className={styles.sectionCard}>
              <SectionHeader
                label="Social Links"
                expanded={expandedSections.socialLinks}
                onToggle={() => toggleSection('socialLinks')}
              />
              {SOCIAL_PLATFORM_OPTIONS.some((option) => socialLinks[option.value]) ? (
                <div className={styles.socialLinksDisplay}>
                  {SOCIAL_PLATFORM_OPTIONS.map((option) =>
                    socialLinks[option.value] ? (
                      <a
                        key={option.value}
                        className={styles.socialBadge}
                        href={socialLinks[option.value]}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {option.label}
                      </a>
                    ) : null
                  )}
                </div>
              ) : null}
              {expandedSections.socialLinks ? (
                <div className={styles.socialLinksGrid}>
                  {SOCIAL_PLATFORM_OPTIONS.map((option) => (
                    <div key={option.value} className={styles.formField}>
                      <label className={styles.formLabel} htmlFor={`profile-social-${option.value}`}>
                        {option.label}
                      </label>
                      <input
                        id={`profile-social-${option.value}`}
                        type="url"
                        className={styles.formInput}
                        value={socialLinksInput[option.value] ?? ''}
                        onChange={(e) => handleSocialLinkChange(option.value, e.target.value)}
                        placeholder={option.placeholder}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className={styles.saveRow}>
              <button
                type="button"
                className={styles.upgradeBtn}
                disabled={isSaving || isBioOverLimit}
                onClick={handleSaveProfile}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>

            {saveError ? <p className={styles.errorMessage}>{saveError}</p> : null}
          </div>
        </div>
      </div>

      {isResumeModalOpen && resumeUrl ? (
        <div className={styles.resumeModalOverlay} onClick={() => setIsResumeModalOpen(false)}>
          <div className={styles.resumeModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.resumeModalHeader}>
              <a
                className={styles.resumeModalIconBtn}
                href={resumeUrl}
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
            <PdfEmbed src={resumeUrl} title="Resume" height={720} showCaption={false} />
          </div>
        </div>
      ) : null}

      <SkillsModal
        open={isSkillsModalOpen}
        onClose={() => setIsSkillsModalOpen(false)}
        allSkills={skillsForCurrentDomain}
        selectedSkillIds={selectedSkillIds}
        onSave={setSelectedSkillIds}
      />
    </>
  );
}

function EmptyProfileSection(): React.JSX.Element {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <ProfileIcon />
            </div>
            <div>
              <h1 className={styles.heading}>Profile</h1>
              <p className={styles.subtitle}>Manage your account details and preferences.</p>
            </div>
          </div>
        </div>
      </div>
      <EmptySection
        icon={ProfileIcon}
        title="Nothing here yet"
        message="This role doesn't use the candidate profile editor. Use the sidebar to get to the tools for your role."
      />
    </div>
  );
}

export default function ProfilePage(): React.JSX.Element {
  const { role, loading } = useAuth();
  const hasFullAccess = role !== null && FULL_DASHBOARD_ROLES.includes(role);
  const isInsiderRole = role === 'admin' || role === 'internal_hr';

  return (
    <DashboardLayout title="Profile" description="Your Sypher profile">
      {loading ? (
        <p role="status">Loading…</p>
      ) : hasFullAccess ? (
        <LearnerProfileContent />
      ) : isInsiderRole ? (
        <div className={styles.container}>
          <InsiderProfileSection />
        </div>
      ) : (
        <EmptyProfileSection />
      )}
    </DashboardLayout>
  );
}

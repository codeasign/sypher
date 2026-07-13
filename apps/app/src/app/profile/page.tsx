'use client';

import React, { useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { createRazorpayOrder, verifyRazorpayPayment, loadRazorpayCheckout } from '@/data/payments';
import { updateOwnBio } from '@/data/profiles';
import { uploadToBunny } from '@/data/bunnyUpload';
import PdfEmbed from '@/components/PdfEmbed';
import { LOOKING_FOR_OPTIONS } from '@/types/lookingFor';
import type { LookingFor } from '@/types/lookingFor';
import { EDUCATION_STATUS_OPTIONS, EXPERIENCE_YEARS_OPTIONS, PASSING_YEAR_OPTIONS } from '@/types/educationStatus';
import type { EducationStatus } from '@/types/educationStatus';
import { CURRENT_STATUS_OPTIONS, NOTICE_PERIOD_OPTIONS } from '@/types/currentStatus';
import type { CurrentStatus, NoticePeriod } from '@/types/currentStatus';
import { SOCIAL_PLATFORM_OPTIONS } from '@/types/socialLinks';
import type { SocialLinks } from '@/types/socialLinks';
import { fetchTaxonomy } from '@/data/taxonomy';
import {
  getOwnSkills,
  getOwnTechnologies,
  setOwnSkills,
  setOwnTechnologies,
  setOwnDesignation,
} from '@/data/userTaxonomy';
import { SENIORITY_LEVEL_OPTIONS } from '@/types/seniority';
import type { SeniorityLevel } from '@/types/seniority';
import styles from './profile.module.css';

const BUNNY_CONFIG = {
  bunnyStorageZone: process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE,
  bunnyStorageAccessKey: process.env.NEXT_PUBLIC_BUNNY_STORAGE_ACCESS_KEY,
  bunnyStorageHostname: process.env.NEXT_PUBLIC_BUNNY_STORAGE_HOSTNAME,
  bunnyPullZoneUrl: process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL,
};

const BIO_WORD_LIMIT = 250;
const PROFICIENCY_OPTIONS = ['beginner', 'intermediate', 'advanced', 'expert'];

interface TaxonomyCatalog {
  domains: { id: string; name: string; roleIds: string[]; skillIds: string[]; technologyIds: string[] }[];
  roles: { id: string; name: string; seniorityLevels: SeniorityLevel[] }[];
  skills: { id: string; name: string }[];
  technologies: { id: string; name: string }[];
}

interface SkillPick {
  skillId: string;
  proficiency: string;
  yearsExperience: string;
}

interface TechnologyPick {
  technologyId: string;
  proficiency: string;
  yearsExperience: string;
}

interface SkillRow {
  skill_id: string;
  proficiency: string | null;
  years_experience: number | null;
}

interface TechnologyRow {
  technology_id: string;
  proficiency: string | null;
  years_experience: number | null;
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

export default function ProfilePage(): React.JSX.Element {
  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const paidUpgradePriceInrPaise = process.env.NEXT_PUBLIC_PAID_UPGRADE_PRICE_INR_PAISE;

  const {
    supabase,
    user,
    session,
    role,
    paidUntil,
    companyName,
    bio,
    currentStatus,
    noticePeriod,
    lookingFor,
    educationStatus,
    experienceYears,
    passingYear,
    resumeUrl,
    socialLinks,
    designationId,
    designationSeniority,
    refreshProfile,
  } = useAuth();
  const [activeTab, setActiveTab] = useState<'aboutMe' | 'billing'>('aboutMe');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [bioInput, setBioInput] = useState('');
  const [currentStatusInput, setCurrentStatusInput] = useState<CurrentStatus | null>(null);
  const [noticePeriodInput, setNoticePeriodInput] = useState<NoticePeriod | null>(null);
  const [lookingForInput, setLookingForInput] = useState<LookingFor[]>([]);
  const [educationStatusInput, setEducationStatusInput] = useState<EducationStatus | null>(null);
  const [experienceYearsInput, setExperienceYearsInput] = useState<number | null>(null);
  const [passingYearInput, setPassingYearInput] = useState<number | null>(null);
  const [socialLinksInput, setSocialLinksInput] = useState<SocialLinks>({});
  const [isSocialLinksExpanded, setIsSocialLinksExpanded] = useState(false);
  const [isSavingAbout, setIsSavingAbout] = useState(false);
  const [aboutError, setAboutError] = useState<string | null>(null);
  const [aboutSaved, setAboutSaved] = useState(false);

  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  const [taxonomyCatalog, setTaxonomyCatalog] = useState<TaxonomyCatalog | null>(null);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);

  const [designationDomainId, setDesignationDomainId] = useState('');
  const [designationRoleId, setDesignationRoleId] = useState('');
  const [designationSeniorityInput, setDesignationSeniorityInput] = useState('');

  const [skillPicks, setSkillPicks] = useState<SkillPick[]>([]);
  const [technologyPicks, setTechnologyPicks] = useState<TechnologyPick[]>([]);
  const [skillToAdd, setSkillToAdd] = useState('');
  const [technologyToAdd, setTechnologyToAdd] = useState('');

  const [isSavingSkills, setIsSavingSkills] = useState(false);
  const [skillsError, setSkillsError] = useState<string | null>(null);
  const [skillsSaved, setSkillsSaved] = useState(false);

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
      setSkillPicks(
        rows.map((r) => ({
          skillId: r.skill_id,
          proficiency: r.proficiency ?? '',
          yearsExperience: r.years_experience != null ? String(r.years_experience) : '',
        }))
      )
    );
    getOwnTechnologies(supabase, session.user.id).then((rows: TechnologyRow[]) =>
      setTechnologyPicks(
        rows.map((r) => ({
          technologyId: r.technology_id,
          proficiency: r.proficiency ?? '',
          yearsExperience: r.years_experience != null ? String(r.years_experience) : '',
        }))
      )
    );
  }, [supabase, session?.user.id]);

  useEffect(() => {
    setDesignationRoleId(designationId ?? '');
    setDesignationSeniorityInput(designationSeniority ?? '');
    if (taxonomyCatalog && designationId) {
      const domain = taxonomyCatalog.domains.find((d) => d.roleIds.includes(designationId));
      if (domain) setDesignationDomainId(domain.id);
    }
  }, [designationId, designationSeniority, taxonomyCatalog]);

  function toggleLookingFor(value: LookingFor): void {
    setLookingForInput((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function handleEducationStatusChange(value: EducationStatus): void {
    setEducationStatusInput(value);
    if (value !== 'experienced') {
      setExperienceYearsInput(null);
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

  const selectedDomain = taxonomyCatalog?.domains.find((d) => d.id === designationDomainId) ?? null;
  const rolesForSelectedDomain = selectedDomain
    ? taxonomyCatalog!.roles.filter((r) => selectedDomain.roleIds.includes(r.id))
    : [];
  const selectedRole = taxonomyCatalog?.roles.find((r) => r.id === designationRoleId) ?? null;
  const seniorityOptionsForSelectedRole = selectedRole
    ? SENIORITY_LEVEL_OPTIONS.filter((o) => selectedRole.seniorityLevels.includes(o.value))
    : SENIORITY_LEVEL_OPTIONS;

  function handleDesignationDomainChange(domainId: string): void {
    setDesignationDomainId(domainId);
    setDesignationRoleId('');
    setDesignationSeniorityInput('');
  }

  function handleDesignationRoleChange(roleId: string): void {
    setDesignationRoleId(roleId);
    const role = taxonomyCatalog?.roles.find((r) => r.id === roleId);
    setDesignationSeniorityInput(role?.seniorityLevels[0] ?? '');
  }

  const availableSkills = (taxonomyCatalog?.skills ?? []).filter(
    (s) => !skillPicks.some((p) => p.skillId === s.id)
  );
  const availableTechnologies = (taxonomyCatalog?.technologies ?? []).filter(
    (t) => !technologyPicks.some((p) => p.technologyId === t.id)
  );

  function addSkillPick(): void {
    if (!skillToAdd) return;
    setSkillPicks((prev) => [...prev, { skillId: skillToAdd, proficiency: '', yearsExperience: '' }]);
    setSkillToAdd('');
  }

  function updateSkillPick(skillId: string, field: 'proficiency' | 'yearsExperience', value: string): void {
    setSkillPicks((prev) => prev.map((p) => (p.skillId === skillId ? { ...p, [field]: value } : p)));
  }

  function removeSkillPick(skillId: string): void {
    setSkillPicks((prev) => prev.filter((p) => p.skillId !== skillId));
  }

  function addTechnologyPick(): void {
    if (!technologyToAdd) return;
    setTechnologyPicks((prev) => [...prev, { technologyId: technologyToAdd, proficiency: '', yearsExperience: '' }]);
    setTechnologyToAdd('');
  }

  function updateTechnologyPick(technologyId: string, field: 'proficiency' | 'yearsExperience', value: string): void {
    setTechnologyPicks((prev) =>
      prev.map((p) => (p.technologyId === technologyId ? { ...p, [field]: value } : p))
    );
  }

  function removeTechnologyPick(technologyId: string): void {
    setTechnologyPicks((prev) => prev.filter((p) => p.technologyId !== technologyId));
  }

  async function handleSaveSkills(): Promise<void> {
    if (!session?.user.id) return;
    setIsSavingSkills(true);
    setSkillsError(null);
    setSkillsSaved(false);
    try {
      const results = await Promise.all([
        designationRoleId
          ? setOwnDesignation(supabase, designationRoleId, designationSeniorityInput || null)
          : Promise.resolve({ error: null }),
        setOwnSkills(
          supabase,
          session.user.id,
          skillPicks.map((p) => ({
            skillId: p.skillId,
            proficiency: p.proficiency || null,
            yearsExperience: p.yearsExperience ? Number(p.yearsExperience) : null,
          }))
        ),
        setOwnTechnologies(
          supabase,
          session.user.id,
          technologyPicks.map((p) => ({
            technologyId: p.technologyId,
            proficiency: p.proficiency || null,
            yearsExperience: p.yearsExperience ? Number(p.yearsExperience) : null,
          }))
        ),
      ]);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) {
        setSkillsError(firstError);
      } else {
        setSkillsSaved(true);
        await refreshProfile();
      }
    } finally {
      setIsSavingSkills(false);
    }
  }

  const bioWordCount = countWords(bioInput);
  const isBioOverLimit = bioWordCount > BIO_WORD_LIMIT;

  async function handleSaveAbout(): Promise<void> {
    if (!session?.user.id || isBioOverLimit) return;
    setAboutError(null);
    setAboutSaved(false);
    setIsSavingAbout(true);
    try {
      const { error } = await updateOwnBio(
        supabase,
        bioInput.trim(),
        lookingForInput,
        undefined,
        educationStatusInput,
        experienceYearsInput,
        currentStatusInput,
        noticePeriodInput,
        passingYearInput,
        socialLinksInput
      );
      if (error) {
        setAboutError(error);
      } else {
        setAboutSaved(true);
        await refreshProfile();
      }
    } finally {
      setIsSavingAbout(false);
    }
  }

  // Switching browser tabs can trigger a Supabase auth event that re-syncs
  // form state from the last-saved profile, clearing any unsaved edits.
  // Auto-saving right as the tab is hidden means there's nothing left to
  // lose by the time that happens.
  const handleSaveAboutRef = useRef(handleSaveAbout);
  handleSaveAboutRef.current = handleSaveAbout;

  useEffect(() => {
    function handleVisibilityChange(): void {
      if (document.hidden) {
        handleSaveAboutRef.current();
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
        socialLinksInput
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

  async function handleUpgrade(): Promise<void> {
    if (!session?.access_token) return;
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const Razorpay = await loadRazorpayCheckout();
      const order = await createRazorpayOrder(session.access_token, apiBaseUrl);

      const checkout = new Razorpay({
        key: razorpayKeyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'Sypher',
        description: 'Paid plan — 1 year',
        prefill: { email: user?.email ?? '' },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyRazorpayPayment(session.access_token, response, apiBaseUrl);
            await refreshProfile();
          } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Payment verification failed');
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
      });

      checkout.on('payment.failed', () => {
        setErrorMessage('Payment failed — please try again.');
        setIsProcessing(false);
      });

      checkout.open();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
      setIsProcessing(false);
    }
  }

  return (
    <DashboardLayout title="Profile" description="Your Sypher profile">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.heading}>Profile</h1>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={activeTab === 'aboutMe' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('aboutMe')}
          >
            About Me
          </button>
          <button
            type="button"
            className={activeTab === 'billing' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('billing')}
          >
            Billing
          </button>
        </div>

        {activeTab === 'aboutMe' ? (
          <>
          <div className={styles.card}>
            <div className={styles.formField}>
              <div className={styles.formLabelRow}>
                <label className={styles.formLabel} htmlFor="profile-bio">About me</label>
                <span className={isBioOverLimit ? styles.wordCountOver : styles.wordCount}>
                  {bioWordCount}/{BIO_WORD_LIMIT} words
                </span>
              </div>
              <textarea
                id="profile-bio"
                className={styles.formTextarea}
                rows={4}
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="Tell us a bit about yourself…"
              />
            </div>

            <div className={styles.formField}>
              <span className={styles.formLabel}>Resume</span>
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
            </div>

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
                <label className={styles.formLabel} htmlFor="profile-experience-years">
                  Total Years of Experience
                </label>
                <select
                  id="profile-experience-years"
                  className={styles.formSelect}
                  value={experienceYearsInput ?? ''}
                  onChange={(e) => setExperienceYearsInput(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Select…</option>
                  {EXPERIENCE_YEARS_OPTIONS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
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

            <div className={styles.formField}>
              <div className={styles.formLabelRow}>
                <span className={styles.formLabel}>Social Links</span>
                <button
                  type="button"
                  className={styles.collapseToggleBtn}
                  onClick={() => setIsSocialLinksExpanded((prev) => !prev)}
                  aria-expanded={isSocialLinksExpanded}
                  aria-label={isSocialLinksExpanded ? 'Collapse social links' : 'Expand social links'}
                  title={isSocialLinksExpanded ? 'Collapse' : 'Expand'}
                >
                  {isSocialLinksExpanded ? '▾' : '▸'}
                </button>
              </div>
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
              {isSocialLinksExpanded ? (
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
                disabled={isSavingAbout || isBioOverLimit}
                onClick={handleSaveAbout}
              >
                {isSavingAbout ? 'Saving…' : 'Save'}
              </button>
            </div>

            {aboutError ? <p className={styles.errorMessage}>{aboutError}</p> : null}
            {aboutSaved && !aboutError ? <p className={styles.savedMessage}>Saved.</p> : null}

            {companyName && role !== 'free_users' && role !== 'paid_users' ? (
              <div className={styles.aboutField}>
                <span className={styles.aboutLabel}>Company</span>
                <span className={styles.companyBadge}>{companyName}</span>
              </div>
            ) : null}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionHeading}>Skills & Technologies</h2>

            {taxonomyError ? (
              <p className={styles.errorMessage}>{taxonomyError}</p>
            ) : (
              <>
                <div className={styles.formField}>
                  <span className={styles.formLabel}>Designation</span>
                  <div className={styles.designationRow}>
                    <select
                      className={styles.formSelect}
                      value={designationDomainId}
                      onChange={(e) => handleDesignationDomainChange(e.target.value)}
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
                      value={designationRoleId}
                      onChange={(e) => handleDesignationRoleChange(e.target.value)}
                      disabled={!designationDomainId}
                    >
                      <option value="">Select a role…</option>
                      {rolesForSelectedDomain.map((role_) => (
                        <option key={role_.id} value={role_.id}>
                          {role_.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={styles.formSelect}
                      value={designationSeniorityInput}
                      onChange={(e) => setDesignationSeniorityInput(e.target.value)}
                      disabled={!designationRoleId}
                    >
                      {seniorityOptionsForSelectedRole.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formField}>
                  <span className={styles.formLabel}>Skills</span>
                  {skillPicks.map((pick) => {
                    const skill = taxonomyCatalog?.skills.find((s) => s.id === pick.skillId);
                    return (
                      <div key={pick.skillId} className={styles.pickRow}>
                        <span className={styles.pickName}>{skill?.name ?? pick.skillId}</span>
                        <select
                          className={styles.pickSelect}
                          value={pick.proficiency}
                          onChange={(e) => updateSkillPick(pick.skillId, 'proficiency', e.target.value)}
                        >
                          <option value="">Proficiency…</option>
                          {PROFICIENCY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0}
                          className={styles.pickYearsInput}
                          placeholder="Years"
                          value={pick.yearsExperience}
                          onChange={(e) => updateSkillPick(pick.skillId, 'yearsExperience', e.target.value)}
                        />
                        <button
                          type="button"
                          className={styles.pickRemoveBtn}
                          onClick={() => removeSkillPick(pick.skillId)}
                          aria-label={`Remove ${skill?.name ?? 'skill'}`}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  <div className={styles.addItemRow}>
                    <select
                      className={styles.formSelect}
                      value={skillToAdd}
                      onChange={(e) => setSkillToAdd(e.target.value)}
                    >
                      <option value="">Add a skill…</option>
                      {availableSkills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={styles.addItemBtn}
                      disabled={!skillToAdd}
                      onClick={addSkillPick}
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className={styles.formField}>
                  <span className={styles.formLabel}>Technologies</span>
                  {technologyPicks.map((pick) => {
                    const technology = taxonomyCatalog?.technologies.find((t) => t.id === pick.technologyId);
                    return (
                      <div key={pick.technologyId} className={styles.pickRow}>
                        <span className={styles.pickName}>{technology?.name ?? pick.technologyId}</span>
                        <select
                          className={styles.pickSelect}
                          value={pick.proficiency}
                          onChange={(e) => updateTechnologyPick(pick.technologyId, 'proficiency', e.target.value)}
                        >
                          <option value="">Proficiency…</option>
                          {PROFICIENCY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0}
                          className={styles.pickYearsInput}
                          placeholder="Years"
                          value={pick.yearsExperience}
                          onChange={(e) => updateTechnologyPick(pick.technologyId, 'yearsExperience', e.target.value)}
                        />
                        <button
                          type="button"
                          className={styles.pickRemoveBtn}
                          onClick={() => removeTechnologyPick(pick.technologyId)}
                          aria-label={`Remove ${technology?.name ?? 'technology'}`}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  <div className={styles.addItemRow}>
                    <select
                      className={styles.formSelect}
                      value={technologyToAdd}
                      onChange={(e) => setTechnologyToAdd(e.target.value)}
                    >
                      <option value="">Add a technology…</option>
                      {availableTechnologies.map((technology) => (
                        <option key={technology.id} value={technology.id}>
                          {technology.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={styles.addItemBtn}
                      disabled={!technologyToAdd}
                      onClick={addTechnologyPick}
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className={styles.saveRow}>
                  <button
                    type="button"
                    className={styles.upgradeBtn}
                    disabled={isSavingSkills}
                    onClick={handleSaveSkills}
                  >
                    {isSavingSkills ? 'Saving…' : 'Save Skills & Technologies'}
                  </button>
                </div>
                {skillsError ? <p className={styles.errorMessage}>{skillsError}</p> : null}
                {skillsSaved && !skillsError ? <p className={styles.savedMessage}>Saved.</p> : null}
              </>
            )}
          </div>
          </>
        ) : (
          <div className={styles.card}>
            <div className={styles.planRow}>
              <span className={`${styles.statusBadge} ${isPaidAndActive ? styles.statusPaid : styles.statusFree}`}>
                {isPaidAndActive ? 'Paid plan' : 'Free plan'}
              </span>
            </div>

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

            {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
          </div>
        )}
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
    </DashboardLayout>
  );
}

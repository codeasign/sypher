'use client';

import React, { useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import RequireNavAccess from '@/components/RequireNavAccess';
import { useAuth } from '@/contexts/AuthContext';
import { uploadToBunny } from '@/data/bunnyUpload';
import { getCompanyBranding, upsertCompanyBranding, listCompanyBrandings } from '@/data/companyBranding';
import { fetchLocations } from '@/data/locations';
import { BrandingIcon } from '@/components/NavIcons';
import { trackEvent } from '@/lib/analytics';
import styles from './add-company-branding.module.css';

interface LocationsCatalog {
  states: { id: string; name: string; slug: string; locationIds: string[] }[];
  locations: { id: string; name: string; slug: string; stateId: string }[];
}

const BUNNY_CONFIG = {
  bunnyStorageZone: process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE,
  bunnyStorageAccessKey: process.env.NEXT_PUBLIC_BUNNY_STORAGE_ACCESS_KEY,
  bunnyStorageHostname: process.env.NEXT_PUBLIC_BUNNY_STORAGE_HOSTNAME,
  bunnyPullZoneUrl: process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL,
};

const EMPLOYEE_RANGES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
];

function AddCompanyBrandingContent(): React.JSX.Element {
  const { supabase, companyName, role, user } = useAuth();
  const isExternalPoster = role === 'external_job_poster';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const [lookupCompanyName, setLookupCompanyName] = useState('');
  const [activeCompanyName, setActiveCompanyName] = useState<string | null>(null);
  const [brandings, setBrandings] = useState<Array<{ company_name: string; display_name: string | null; logo_url: string | null }>>([]);

  const [displayName, setDisplayName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [employeeRange, setEmployeeRange] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [locationsCatalog, setLocationsCatalog] = useState<LocationsCatalog | null>(null);
  const [locationStateId, setLocationStateId] = useState('');
  const [locationInput, setLocationInput] = useState('');

  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    trackEvent('branding_page_view');
  }, []);

  function resetFields(): void {
    setDisplayName('');
    setLogoUrl(null);
    setTagline('');
    setAbout('');
    setLinkedinUrl('');
    setEmployeeRange('');
    setLocations([]);
    setLocationStateId('');
    setLocationInput('');
  }

  useEffect(() => {
    fetchLocations().then((data) => setLocationsCatalog(data as LocationsCatalog));
  }, []);

  useEffect(() => {
    if (isExternalPoster) {
      setLoading(false);
      if (supabase && user?.id) listCompanyBrandings(supabase, user.id).then(setBrandings);
      return;
    }
    let active = true;
    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      if (!supabase || !companyName) {
        setError('Your account has no company assigned. Contact an admin.');
        setLoading(false);
        return;
      }
      const branding = await getCompanyBranding(supabase, companyName);
      if (!active) return;
      if (branding) {
        setDisplayName(branding.display_name ?? '');
        setLogoUrl(branding.logo_url ?? null);
        setTagline(branding.tagline ?? '');
        setAbout(branding.about ?? '');
        setLinkedinUrl(branding.linkedin_url ?? '');
        setEmployeeRange(branding.employee_range ?? '');
        setLocations(branding.locations ?? []);
      }
      setActiveCompanyName(companyName);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase, companyName, isExternalPoster, user?.id]);

  async function handleLookup(nameOverride?: string): Promise<void> {
    const name = (nameOverride ?? lookupCompanyName).trim();
    if (!name || !supabase) return;
    trackEvent('branding_company_lookup_submit');
    setLoading(true);
    setError(null);
    setSaved(false);
    const branding = await getCompanyBranding(supabase, name);
    if (branding) {
      setDisplayName(branding.display_name ?? '');
      setLogoUrl(branding.logo_url ?? null);
      setTagline(branding.tagline ?? '');
      setAbout(branding.about ?? '');
      setLinkedinUrl(branding.linkedin_url ?? '');
      setEmployeeRange(branding.employee_range ?? '');
      setLocations(branding.locations ?? []);
    } else {
      resetFields();
    }
    setActiveCompanyName(name);
    setLoading(false);
  }

  function switchCompany(): void {
    trackEvent('branding_switch_company_click');
    setActiveCompanyName(null);
    setLookupCompanyName('');
    resetFields();
    setSaved(false);
    setError(null);
  }

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file || !activeCompanyName) return;
    setLogoUploading(true);
    setError(null);
    try {
      const url = await uploadToBunny(file, `branding/${activeCompanyName}`, BUNNY_CONFIG);
      trackEvent('branding_logo_upload');
      setLogoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo.');
    } finally {
      setLogoUploading(false);
    }
  }

  const locationsForState = (locationsCatalog?.locations ?? []).filter((l) => l.stateId === locationStateId);

  function handleLocationStateChange(stateId: string): void {
    setLocationStateId(stateId);
    setLocationInput('');
  }

  function addLocation(): void {
    const location = (locationsCatalog?.locations ?? []).find((l) => l.id === locationInput);
    if (!location || locations.includes(location.name)) {
      setLocationInput('');
      return;
    }
    trackEvent('branding_location_add');
    setLocations((prev) => [...prev, location.name]);
    setLocationInput('');
  }

  function removeLocation(value: string): void {
    setLocations((prev) => prev.filter((loc) => loc !== value));
  }

  async function handleSave(): Promise<void> {
    if (!supabase || !activeCompanyName) return;
    trackEvent('branding_save_click');
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error: saveError } = await upsertCompanyBranding(
      supabase,
      activeCompanyName,
      {
        display_name: displayName.trim() || null,
        logo_url: logoUrl,
        tagline: tagline.trim() || null,
        about: about.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        employee_range: employeeRange || null,
        locations,
      },
      isExternalPoster ? user?.id : undefined
    );
    setSaving(false);
    if (saveError) {
      trackEvent('branding_save_error', { error: saveError });
      setError(saveError);
      return;
    }
    setSaved(true);
    if (isExternalPoster && user?.id) {
      listCompanyBrandings(supabase, user.id).then(setBrandings);
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading branding settings...</p>
        </div>
      </div>
    );
  }

  if (isExternalPoster && !activeCompanyName) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <BrandingIcon />
          </div>
          <div>
            <h1 className={styles.heading}>Add Company Branding</h1>
            <p className={styles.subtitle}>Look up a company to create or edit its branding on their behalf.</p>
          </div>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.card}>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="branding-lookup-company">
              Company Name
            </label>
            <input
              id="branding-lookup-company"
              type="text"
              className={styles.input}
              value={lookupCompanyName}
              onChange={(e) => setLookupCompanyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleLookup();
                }
              }}
              placeholder="Exact company name"
            />
          </div>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => handleLookup()}
            disabled={!lookupCompanyName.trim()}
          >
            Load / Create
          </button>
        </div>

        {brandings.length > 0 && (
          <div className={styles.card}>
            <span className={styles.fieldLabel}>Existing company brandings</span>
            <div className={styles.brandingList}>
              {brandings.map((b) => (
                <div key={b.company_name} className={styles.brandingListRow}>
                  {b.logo_url ? (
                    <img src={b.logo_url} alt="" className={styles.brandingListLogo} />
                  ) : (
                    <div className={styles.brandingListLogoPlaceholder} />
                  )}
                  <span className={styles.brandingListName}>{b.display_name || b.company_name}</span>
                  <button
                    type="button"
                    className={styles.brandingListEditBtn}
                    onClick={() => handleLookup(b.company_name)}
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <BrandingIcon />
        </div>
        <div>
          <h1 className={styles.heading}>Add Company Branding</h1>
          <p className={styles.subtitle}>
            {isExternalPoster
              ? `Editing branding on behalf of ${activeCompanyName}.`
              : `Set your company name, logo, brand colors, and profile details for ${companyName}.`}
          </p>
          {isExternalPoster && (
            <button type="button" className={styles.switchCompanyBtn} onClick={switchCompany}>
              Switch company
            </button>
          )}
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {saved && !error && <p className={styles.saved}>Branding saved.</p>}

      <div className={styles.layout}>
        <div className={styles.card}>
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="branding-company-name">
              Company Name
            </label>
            <input
              id="branding-company-name"
              type="text"
              className={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={companyName ?? 'e.g. Acme Corporation'}
              disabled={saving}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="branding-logo">
              Logo
            </label>
            <div className={styles.logoField}>
              {logoUrl && <img src={logoUrl} alt="Logo preview" className={styles.logoPreview} />}
              <label htmlFor="branding-logo" className={styles.logoUploadLabel}>
                {logoUrl ? 'Replace logo' : 'Upload logo'}
              </label>
              <input
                id="branding-logo"
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className={styles.fileInput}
                onChange={handleLogoChange}
                disabled={saving || logoUploading}
              />
              {logoUploading && <span className={styles.uploadingNote}>Uploading…</span>}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="branding-tagline">
              Tagline
            </label>
            <input
              id="branding-tagline"
              type="text"
              className={styles.input}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Building the future of AI, together"
              disabled={saving}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="branding-about">
              About
            </label>
            <textarea
              id="branding-about"
              className={styles.textarea}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="A short description of your company"
              rows={6}
              disabled={saving}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="branding-linkedin">
                LinkedIn
              </label>
              <input
                id="branding-linkedin"
                type="url"
                className={styles.input}
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/company/..."
                disabled={saving}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.fieldLabel} htmlFor="branding-employee-range">
                Number of employees
              </label>
              <select
                id="branding-employee-range"
                className={styles.select}
                value={employeeRange}
                onChange={(e) => setEmployeeRange(e.target.value)}
                disabled={saving}
              >
                <option value="">Select range</option>
                {EMPLOYEE_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="branding-location-input">
              Locations
            </label>
            <div className={styles.locationInputRow}>
              <select
                className={styles.select}
                value={locationStateId}
                onChange={(e) => handleLocationStateChange(e.target.value)}
                disabled={saving}
              >
                <option value="">Select a state</option>
                {(locationsCatalog?.states ?? []).map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.name}
                  </option>
                ))}
              </select>
              <select
                id="branding-location-input"
                className={styles.select}
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                disabled={saving || !locationStateId}
              >
                <option value="">Select a location</option>
                {locationsForState.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              <button type="button" className={styles.addLocationBtn} onClick={addLocation} disabled={saving || !locationInput}>
                Add
              </button>
            </div>
            {locations.length > 0 && (
              <div className={styles.locationTags}>
                {locations.map((loc) => (
                  <span key={loc} className={styles.locationTag}>
                    {loc}
                    <button
                      type="button"
                      className={styles.removeLocationBtn}
                      onClick={() => removeLocation(loc)}
                      disabled={saving}
                      aria-label={`Remove ${loc}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className={styles.previewWrapper}>
          <span className={styles.previewLabel}>Live preview</span>
          <div className={styles.previewCard}>
            <div className={styles.previewBanner}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className={styles.previewLogo} />
              ) : (
                <div className={styles.previewLogoPlaceholder} />
              )}
              <p className={styles.previewCompanyName}>{displayName || activeCompanyName || 'Company Name'}</p>
              <p className={styles.previewTagline}>{tagline || 'Your tagline goes here'}</p>
            </div>
            <div className={styles.previewBody}>
              {about ? (
                <p className={styles.previewAbout}>{about}</p>
              ) : (
                <p className={styles.previewAboutEmpty}>About text will appear here.</p>
              )}
              {(employeeRange || locations.length > 0 || linkedinUrl) && (
                <div className={styles.previewMeta}>
                  {employeeRange && (
                    <span className={styles.previewMetaBadge}>
                      {EMPLOYEE_RANGES.find((r) => r.value === employeeRange)?.label ?? employeeRange}
                    </span>
                  )}
                  {locations.map((loc) => (
                    <span key={loc} className={styles.previewMetaBadge}>
                      {loc}
                    </span>
                  ))}
                  {linkedinUrl && (
                    <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className={styles.previewLinkedin}>
                      LinkedIn ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddCompanyBrandingPage(): React.JSX.Element {
  return (
    <DashboardLayout title="Add Company Branding" description="Set your logo, colors, tagline, and about text.">
      <RequireNavAccess itemKey="add-company-branding">
        <AddCompanyBrandingContent />
      </RequireNavAccess>
    </DashboardLayout>
  );
}

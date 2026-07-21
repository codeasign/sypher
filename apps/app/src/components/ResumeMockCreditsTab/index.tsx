'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchResumeMockAdminConfig,
  savePlanFeatureDefault,
  fetchUserFeatureOverride,
  saveUserFeatureOverride,
  saveConversionRate,
  saveCreditPack,
} from '@/data/featureCredits';
import manageAccessStyles from '@/app/manage-access/manage-access.module.css';
import styles from './styles.module.css';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface PackDraft {
  id?: string;
  name: string;
  credits: number;
  pricePaise: number;
  isActive: boolean;
  sortOrder: number;
}

type PlanRole = 'free_users' | 'paid_users';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const PACK_TIERS: Array<'bronze' | 'silver' | 'gold' | 'ultra'> = ['bronze', 'silver', 'gold', 'ultra'];
const PACK_TIER_LABELS: Record<string, string> = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', ultra: 'Ultra' };
const PLAN_ROLE_LABELS: Record<PlanRole, string> = { free_users: 'Free Users', paid_users: 'Paid Users' };

function emptyPackDraft(): PackDraft {
  return { name: '', credits: 0, pricePaise: 0, isActive: true, sortOrder: 0 };
}

function formatRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

function saveLabel(status: SaveStatus | undefined, idleLabel = 'Save'): string {
  if (status === 'saving') return 'Saving…';
  if (status === 'saved') return 'Saved';
  return idleLabel;
}

export default function ResumeMockCreditsTab(): React.JSX.Element {
  const { supabase } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});

  const [defaults, setDefaults] = useState<Record<PlanRole, { resume: number; mock: number }>>({
    free_users: { resume: 0, mock: 0 },
    paid_users: { resume: 0, mock: 0 },
  });
  const [rates, setRates] = useState<Record<string, number>>({ resume_review: 0, mock_interview: 0 });
  const [packs, setPacks] = useState<Record<string, PackDraft>>({});

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [overrideEmail, setOverrideEmail] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [overrideBonus, setOverrideBonus] = useState({ resume: 0, mock: 0 });
  const [overrideLoading, setOverrideLoading] = useState(false);

  const fetchAll = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError('Auth is not configured. Check Supabase environment variables.');
      setLoading(false);
      return;
    }
    const { defaultRows, rateRows, packRows, profileRows } = await fetchResumeMockAdminConfig(supabase, {
      forceRefresh,
    });

    const nextDefaults: Record<PlanRole, { resume: number; mock: number }> = {
      free_users: { resume: 0, mock: 0 },
      paid_users: { resume: 0, mock: 0 },
    };
    for (const row of defaultRows as { role: PlanRole; resume_reviews_included: number; mock_interviews_included: number }[]) {
      nextDefaults[row.role] = { resume: row.resume_reviews_included, mock: row.mock_interviews_included };
    }
    setDefaults(nextDefaults);

    const nextRates: Record<string, number> = { resume_review: 0, mock_interview: 0 };
    for (const row of rateRows as { feature: string; credits_per_use: number }[]) {
      nextRates[row.feature] = row.credits_per_use;
    }
    setRates(nextRates);

    const nextPacks: Record<string, PackDraft> = {};
    for (const tier of PACK_TIERS) {
      nextPacks[tier] = emptyPackDraft();
    }
    for (const row of packRows as {
      id: string; tier: string; name: string; credits: number; price_paise: number; is_active: boolean; sort_order: number;
    }[]) {
      nextPacks[row.tier] = {
        id: row.id,
        name: row.name,
        credits: row.credits,
        pricePaise: row.price_paise,
        isActive: row.is_active,
        sortOrder: row.sort_order,
      };
    }
    setPacks(nextPacks);

    setProfiles(profileRows as Profile[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function handleDefaultChange(role: PlanRole, field: 'resume' | 'mock', value: number): void {
    setDefaults((prev) => ({ ...prev, [role]: { ...prev[role], [field]: value } }));
    setSaveStatus((prev) => ({ ...prev, [`default:${role}`]: 'idle' }));
  }

  async function handleSaveDefault(role: PlanRole): Promise<void> {
    setSaveStatus((prev) => ({ ...prev, [`default:${role}`]: 'saving' }));
    const { resume, mock } = defaults[role];
    const { error: saveError } = await savePlanFeatureDefault(supabase, role, resume, mock);
    setFieldErrors((prev) => ({ ...prev, [`default:${role}`]: saveError ?? '' }));
    setSaveStatus((prev) => ({ ...prev, [`default:${role}`]: saveError ? 'error' : 'saved' }));
  }

  function handleRateChange(feature: string, value: number): void {
    setRates((prev) => ({ ...prev, [feature]: value }));
    setSaveStatus((prev) => ({ ...prev, [`rate:${feature}`]: 'idle' }));
  }

  async function handleSaveRate(feature: string): Promise<void> {
    setSaveStatus((prev) => ({ ...prev, [`rate:${feature}`]: 'saving' }));
    const { error: saveError } = await saveConversionRate(supabase, feature, rates[feature]);
    setFieldErrors((prev) => ({ ...prev, [`rate:${feature}`]: saveError ?? '' }));
    setSaveStatus((prev) => ({ ...prev, [`rate:${feature}`]: saveError ? 'error' : 'saved' }));
  }

  function handlePackChange(tier: string, field: keyof PackDraft, value: string | number | boolean): void {
    setPacks((prev) => ({ ...prev, [tier]: { ...prev[tier], [field]: value } as PackDraft }));
    setSaveStatus((prev) => ({ ...prev, [`pack:${tier}`]: 'idle' }));
  }

  async function handleSavePack(tier: string): Promise<void> {
    setSaveStatus((prev) => ({ ...prev, [`pack:${tier}`]: 'saving' }));
    const { error: saveError } = await saveCreditPack(supabase, tier, packs[tier]);
    setFieldErrors((prev) => ({ ...prev, [`pack:${tier}`]: saveError ?? '' }));
    setSaveStatus((prev) => ({ ...prev, [`pack:${tier}`]: saveError ? 'error' : 'saved' }));
  }

  async function handleLookupOverride(): Promise<void> {
    const trimmed = overrideEmail.trim().toLowerCase();
    const match = profiles.find((p) => p.email?.toLowerCase() === trimmed);
    setSaveStatus((prev) => ({ ...prev, override: 'idle' }));
    if (!match) {
      setSelectedProfile(null);
      setFieldErrors((prev) => ({ ...prev, override: 'No user found with that email.' }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, override: '' }));
    setSelectedProfile(match);
    setOverrideLoading(true);
    const row = await fetchUserFeatureOverride(supabase, match.id);
    setOverrideBonus({
      resume: row?.resume_reviews_bonus ?? 0,
      mock: row?.mock_interviews_bonus ?? 0,
    });
    setOverrideLoading(false);
  }

  async function handleSaveOverride(): Promise<void> {
    if (!selectedProfile) return;
    setSaveStatus((prev) => ({ ...prev, override: 'saving' }));
    const { error: saveError } = await saveUserFeatureOverride(
      supabase,
      selectedProfile.id,
      overrideBonus.resume,
      overrideBonus.mock,
    );
    setFieldErrors((prev) => ({ ...prev, override: saveError ?? '' }));
    setSaveStatus((prev) => ({ ...prev, override: saveError ? 'error' : 'saved' }));
  }

  if (loading) {
    return (
      <div className={manageAccessStyles.loadingState}>
        <div className={manageAccessStyles.spinner} />
        <p>Loading credits configuration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={manageAccessStyles.errorState}>
        <p className={manageAccessStyles.errorText}>{error}</p>
        <button type="button" className={manageAccessStyles.retryBtn} onClick={() => fetchAll(true)}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={manageAccessStyles.adminNote}>
        Free/paid defaults are additive with any per-user override — a paid user with a +1 override gets
        plan default + 1. Once included allowance is used up, further requests draw from the user&apos;s
        credit balance at the conversion rate below.
      </div>

      <div className={styles.columns}>
        <div className={styles.column}>
          {/* Plan defaults */}
          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>Plan defaults</h3>
              <p className={styles.sectionDescription}>
                Free uses included per role before further requests draw on the user&apos;s credit balance.
              </p>
            </div>
            <div className={styles.defaultsGrid}>
              {(['free_users', 'paid_users'] as PlanRole[]).map((role) => (
                <div
                  key={role}
                  className={`${manageAccessStyles.roleCard} ${manageAccessStyles.roleCardStatic} ${styles.defaultCard}`}
                >
                  <span className={manageAccessStyles.roleCardLabel}>{PLAN_ROLE_LABELS[role]}</span>
                  <div className={styles.inputRow}>
                    <label className={styles.inlineLabel} htmlFor={`default-${role}-resume`}>Resume reviews</label>
                    <input
                      id={`default-${role}-resume`}
                      type="number"
                      min={0}
                      className={styles.numberInput}
                      value={defaults[role].resume}
                      onChange={(e) => handleDefaultChange(role, 'resume', Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  <div className={styles.inputRow}>
                    <label className={styles.inlineLabel} htmlFor={`default-${role}-mock`}>Mock interviews</label>
                    <input
                      id={`default-${role}-mock`}
                      type="number"
                      min={0}
                      className={styles.numberInput}
                      value={defaults[role].mock}
                      onChange={(e) => handleDefaultChange(role, 'mock', Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  <div className={styles.saveRow}>
                    <button
                      type="button"
                      className={manageAccessStyles.retryBtn}
                      disabled={saveStatus[`default:${role}`] === 'saving'}
                      onClick={() => handleSaveDefault(role)}
                    >
                      {saveLabel(saveStatus[`default:${role}`])}
                    </button>
                  </div>
                  {fieldErrors[`default:${role}`] && <p className={styles.fieldError}>{fieldErrors[`default:${role}`]}</p>}
                </div>
              ))}
            </div>
          </section>

          {/* Conversion rates */}
          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>Credit conversion rates</h3>
              <p className={styles.sectionDescription}>
                How many purchased credits one use costs once included allowance runs out.
              </p>
            </div>
            <div className={styles.rateGrid}>
              <div className={styles.rateCard}>
                <label className={styles.rateCardLabel} htmlFor="rate-resume">Resume review</label>
                <div className={styles.rateInputRow}>
                  <input
                    id="rate-resume"
                    type="number"
                    min={1}
                    className={styles.numberInput}
                    value={rates.resume_review}
                    onChange={(e) => handleRateChange('resume_review', Math.max(1, Number(e.target.value)))}
                  />
                  <span className={styles.rateCardHint}>credits per review</span>
                </div>
                <div className={styles.saveRow}>
                  <button
                    type="button"
                    className={manageAccessStyles.retryBtn}
                    disabled={saveStatus['rate:resume_review'] === 'saving'}
                    onClick={() => handleSaveRate('resume_review')}
                  >
                    {saveLabel(saveStatus['rate:resume_review'])}
                  </button>
                </div>
                {fieldErrors['rate:resume_review'] && (
                  <p className={styles.fieldError}>{fieldErrors['rate:resume_review']}</p>
                )}
              </div>
              <div className={styles.rateCard}>
                <label className={styles.rateCardLabel} htmlFor="rate-mock">Mock interview</label>
                <div className={styles.rateInputRow}>
                  <input
                    id="rate-mock"
                    type="number"
                    min={1}
                    className={styles.numberInput}
                    value={rates.mock_interview}
                    onChange={(e) => handleRateChange('mock_interview', Math.max(1, Number(e.target.value)))}
                  />
                  <span className={styles.rateCardHint}>credits per interview</span>
                </div>
                <div className={styles.saveRow}>
                  <button
                    type="button"
                    className={manageAccessStyles.retryBtn}
                    disabled={saveStatus['rate:mock_interview'] === 'saving'}
                    onClick={() => handleSaveRate('mock_interview')}
                  >
                    {saveLabel(saveStatus['rate:mock_interview'])}
                  </button>
                </div>
                {fieldErrors['rate:mock_interview'] && (
                  <p className={styles.fieldError}>{fieldErrors['rate:mock_interview']}</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className={styles.column}>
          {/* Per-user overrides */}
          <section className={styles.sectionCard}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>Per-user overrides</h3>
              <p className={styles.sectionDescription}>
                Grant one user extra uses on top of their plan default — additive, never a replacement.
              </p>
            </div>
            <label className={manageAccessStyles.fieldLabel} htmlFor="override-email">User email</label>
            <div className={styles.searchRow}>
              <input
                id="override-email"
                type="text"
                className={manageAccessStyles.searchInput}
                value={overrideEmail}
                onChange={(e) => setOverrideEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookupOverride()}
                placeholder="user@example.com"
                list="override-email-options"
              />
              <datalist id="override-email-options">
                {profiles.map((p) => (
                  <option key={p.id} value={p.email} />
                ))}
              </datalist>
              <button
                type="button"
                className={`${manageAccessStyles.retryBtn} ${styles.lookupBtn}`}
                onClick={handleLookupOverride}
              >
                Search Users
              </button>
            </div>

            {fieldErrors.override && <p className={styles.fieldError}>{fieldErrors.override}</p>}

            {selectedProfile && !overrideLoading && (
              <div className={styles.overridePanel}>
                <p className={styles.overrideSubtitle}>
                  {selectedProfile.full_name || selectedProfile.email} — plan: {selectedProfile.role}
                </p>
                <div className={styles.inputRow}>
                  <label className={styles.inlineLabel} htmlFor="override-resume-bonus">Resume review bonus (+)</label>
                  <input
                    id="override-resume-bonus"
                    type="number"
                    min={0}
                    className={styles.numberInput}
                    value={overrideBonus.resume}
                    onChange={(e) => {
                      setOverrideBonus((prev) => ({ ...prev, resume: Math.max(0, Number(e.target.value)) }));
                      setSaveStatus((prev) => ({ ...prev, override: 'idle' }));
                    }}
                  />
                </div>
                <div className={styles.inputRow}>
                  <label className={styles.inlineLabel} htmlFor="override-mock-bonus">Mock interview bonus (+)</label>
                  <input
                    id="override-mock-bonus"
                    type="number"
                    min={0}
                    className={styles.numberInput}
                    value={overrideBonus.mock}
                    onChange={(e) => {
                      setOverrideBonus((prev) => ({ ...prev, mock: Math.max(0, Number(e.target.value)) }));
                      setSaveStatus((prev) => ({ ...prev, override: 'idle' }));
                    }}
                  />
                </div>
                <div className={styles.saveRow}>
                  <button
                    type="button"
                    className={manageAccessStyles.retryBtn}
                    disabled={saveStatus.override === 'saving'}
                    onClick={handleSaveOverride}
                  >
                    {saveLabel(saveStatus.override, 'Save override')}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Credit packs */}
      <section className={styles.sectionCard}>
        <div className={styles.sectionHead}>
          <h3 className={styles.sectionTitle}>Credit packs</h3>
          <p className={styles.sectionDescription}>
            Bronze, Silver, Gold, and Ultra — sold through the existing Razorpay checkout. Prices are in INR.
          </p>
        </div>
        <div className={styles.tableCard}>
          <table className={styles.packTable}>
            <thead>
              <tr>
                <th>Tier</th>
                <th>Name</th>
                <th>Credits</th>
                <th>Price</th>
                <th>Sort</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {PACK_TIERS.map((tier) => {
                const pack = packs[tier] ?? emptyPackDraft();
                return (
                  <tr key={tier}>
                    <td>
                      <span className={`${styles.tierBadge} ${styles[`tier${PACK_TIER_LABELS[tier]}`]}`}>
                        {PACK_TIER_LABELS[tier]}
                      </span>
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.tableInput}
                        value={pack.name}
                        onChange={(e) => handlePackChange(tier, 'name', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        className={styles.tableInputNarrow}
                        value={pack.credits}
                        onChange={(e) => handlePackChange(tier, 'credits', Math.max(1, Number(e.target.value)))}
                      />
                    </td>
                    <td>
                      <div className={styles.priceInputWrap}>
                        <span className={styles.currencyPrefix}>₹</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className={styles.tableInputPrice}
                          value={formatRupees(pack.pricePaise)}
                          onChange={(e) => handlePackChange(tier, 'pricePaise', Math.round(Number(e.target.value) * 100))}
                        />
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        className={styles.tableInputNarrow}
                        value={pack.sortOrder}
                        onChange={(e) => handlePackChange(tier, 'sortOrder', Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        className={manageAccessStyles.checkbox}
                        checked={pack.isActive}
                        onChange={(e) => handlePackChange(tier, 'isActive', e.target.checked)}
                        aria-label={`${PACK_TIER_LABELS[tier]} pack active`}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`${manageAccessStyles.retryBtn} ${styles.rowSaveBtn}`}
                        disabled={saveStatus[`pack:${tier}`] === 'saving'}
                        onClick={() => handleSavePack(tier)}
                      >
                        {saveLabel(saveStatus[`pack:${tier}`])}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {PACK_TIERS.map((tier) =>
          fieldErrors[`pack:${tier}`] ? (
            <p key={tier} className={styles.fieldError}>{PACK_TIER_LABELS[tier]}: {fieldErrors[`pack:${tier}`]}</p>
          ) : null,
        )}
      </section>
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchLocations, invalidateLocationsCache, saveLocationState } from '@/data/locations';
import manageAccessStyles from '@/app/manage-access/manage-access.module.css';
import styles from './styles.module.css';

/* ── Types (mirrors api/locations/route.ts's assembled response) ── */

interface LocationRow {
  id: string;
  name: string;
  slug: string;
  stateId: string;
}

interface StateRow {
  id: string;
  name: string;
  slug: string;
  locationIds: string[];
}

interface LocationsData {
  version: number;
  states: StateRow[];
  locations: LocationRow[];
}

interface LocationPreviewRow {
  name: string;
  slug: string;
  existingId: string | null;
  isExisting: boolean;
}

/* ── Parsing helpers ── */

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function LocationsTab(): React.JSX.Element {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const { supabase } = useAuth();

  const [catalog, setCatalog] = useState<LocationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editingStateId, setEditingStateId] = useState<string | null>(null);

  const [stateNameInput, setStateNameInput] = useState('');
  const [locationsInput, setLocationsInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchCatalog = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLocations(apiBaseUrl, { forceRefresh });
      setCatalog(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const locationPreview = useMemo<LocationPreviewRow[]>(() => {
    if (!catalog) return [];
    const seenSlugs = new Set<string>();
    const rows: LocationPreviewRow[] = [];
    for (const line of parseLines(locationsInput)) {
      const slug = slugify(line);
      if (!slug || seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);

      const existing = catalog.locations.find((l) => l.slug === slug && l.stateId === editingStateId);

      rows.push({
        name: line,
        slug,
        existingId: existing?.id ?? null,
        isExisting: Boolean(existing),
      });
    }
    return rows;
  }, [locationsInput, catalog, editingStateId]);

  function resetForm(): void {
    setEditingStateId(null);
    setStateNameInput('');
    setLocationsInput('');
    setSaveError(null);
    setSaveSuccess(false);
  }

  function startNewState(): void {
    resetForm();
    setMode('form');
  }

  function loadStateIntoForm(state: StateRow): void {
    if (!catalog) return;
    resetForm();
    setEditingStateId(state.id);
    setStateNameInput(state.name);

    const locationLines: string[] = [];
    state.locationIds.forEach((locationId) => {
      const location = catalog.locations.find((l) => l.id === locationId);
      if (location) locationLines.push(location.name);
    });
    setLocationsInput(locationLines.join('\n'));

    setMode('form');
  }

  async function handleConfirmSave(): Promise<void> {
    if (!catalog || !stateNameInput.trim()) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const payload = {
      state: { name: stateNameInput.trim() },
      locations: locationPreview.map((location) => ({ name: location.name })),
    };

    const { error: saveErr } = await saveLocationState(supabase, payload);
    setSaving(false);
    if (saveErr) {
      setSaveError(saveErr);
      return;
    }
    setSaveSuccess(true);
    invalidateLocationsCache();
    await fetchCatalog(true);
    resetForm();
    setMode('list');
  }

  if (loading) {
    return (
      <div className={manageAccessStyles.loadingState}>
        <div className={manageAccessStyles.spinner} />
        <p>Loading locations...</p>
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className={manageAccessStyles.errorState}>
        <p className={manageAccessStyles.errorText}>{error ?? 'Failed to load locations'}</p>
        <button type="button" className={manageAccessStyles.retryBtn} onClick={() => fetchCatalog(true)}>
          Retry
        </button>
      </div>
    );
  }

  if (mode === 'list') {
    return (
      <>
        <div className={manageAccessStyles.adminNote}>
          Paste a state name plus its locations to build the catalog. Existing states can be reopened and edited
          below.
        </div>
        <div className={manageAccessStyles.roleGrid}>
          <button type="button" className={manageAccessStyles.roleCard} onClick={startNewState}>
            <span className={manageAccessStyles.roleCardLabel}>+ New State</span>
          </button>
          {catalog.states.map((state) => (
            <button
              type="button"
              key={state.id}
              className={manageAccessStyles.roleCard}
              onClick={() => loadStateIntoForm(state)}
            >
              <span className={manageAccessStyles.roleCardLabel}>{state.name}</span>
              <span className={manageAccessStyles.roleCardCount}>{state.locationIds.length} locations</span>
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className={styles.formWrap}>
      <button
        type="button"
        className={styles.backBtn}
        onClick={() => {
          resetForm();
          setMode('list');
        }}
      >
        ← Back to states
      </button>

      <div className={styles.saveBar}>
        <button
          type="button"
          className={manageAccessStyles.retryBtn}
          disabled={saving || !stateNameInput.trim()}
          onClick={handleConfirmSave}
        >
          {saving ? 'Saving…' : editingStateId ? 'Confirm & Save Changes' : 'Confirm & Save'}
        </button>
        {saveError && <p className={manageAccessStyles.errorText}>{saveError}</p>}
        {saveSuccess && !saveError && <p className={styles.successMessage}>Saved.</p>}
      </div>

      <div className={manageAccessStyles.fieldLabel}>
        <label htmlFor="location-state-name">State name</label>
      </div>
      <input
        id="location-state-name"
        type="text"
        className={manageAccessStyles.searchInput}
        value={stateNameInput}
        onChange={(e) => setStateNameInput(e.target.value)}
        placeholder="Karnataka"
      />

      <div className={styles.column}>
        <label className={manageAccessStyles.fieldLabel} htmlFor="location-items">
          Locations (one per line)
        </label>
        <textarea
          id="location-items"
          className={styles.textarea}
          rows={8}
          value={locationsInput}
          onChange={(e) => setLocationsInput(e.target.value)}
          placeholder={'Bengaluru\nElectronic City\nElectronic City Phase I\nElectronic City Phase II\nWhitefield'}
        />

        {locationPreview.length > 0 && (
          <div className={styles.previewList}>
            {locationPreview.map((location) => (
              <div key={location.slug} className={styles.previewRow}>
                <div className={styles.previewRowMain}>
                  <span className={styles.previewName}>{location.name}</span>
                </div>
                {location.isExisting ? (
                  <p className={styles.existingNote}>Existing location — will be updated</p>
                ) : (
                  <p className={styles.newNote}>New location</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

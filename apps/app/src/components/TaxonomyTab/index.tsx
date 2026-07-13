'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTaxonomy, saveTaxonomyCategory } from '@/data/taxonomy';
import { SENIORITY_PREFIXES } from '@/types/seniority';
import type { SeniorityLevel } from '@/types/seniority';
import manageAccessStyles from '@/app/manage-access/manage-access.module.css';
import styles from './styles.module.css';

/* ── Types (mirrors api/taxonomy.js's assembled response) ── */

interface TaxonomyRole {
  id: string;
  name: string;
  slug: string;
  seniorityLevels: SeniorityLevel[];
}

interface TaxonomySkill {
  id: string;
  name: string;
  slug: string;
}

interface TaxonomyTechnology {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
}

interface TaxonomyCategory {
  id: string;
  name: string;
  slug: string;
}

interface TaxonomyDomain {
  id: string;
  name: string;
  slug: string;
  roleIds: string[];
  skillIds: string[];
  technologyIds: string[];
}

interface TaxonomyData {
  version: number;
  domains: TaxonomyDomain[];
  roles: TaxonomyRole[];
  skills: TaxonomySkill[];
  technologies: TaxonomyTechnology[];
  technologyCategories: TaxonomyCategory[];
}

interface RolePreviewRow {
  name: string;
  slug: string;
  seniorityLevels: SeniorityLevel[];
  existingId: string | null;
  linkedDomainNames: string[];
}

interface ItemPreviewRow {
  name: string;
  slug: string;
  kind: 'skill' | 'technology';
  existingId: string | null;
  existingCategoryId: string | null;
  linkedDomainNames: string[];
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

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function parseDesignationLine(line: string): { seniority: SeniorityLevel; baseName: string } {
  for (const { prefix, value } of SENIORITY_PREFIXES) {
    const re = new RegExp(`^${prefix}\\s+`, 'i');
    if (re.test(line)) {
      return { seniority: value, baseName: line.replace(re, '').trim() };
    }
  }
  return { seniority: 'base', baseName: line };
}

function collapseDesignations(text: string): { name: string; slug: string; seniorityLevels: SeniorityLevel[] }[] {
  const groups = new Map<string, { name: string; seniorities: Set<SeniorityLevel> }>();
  for (const line of parseLines(text)) {
    const { seniority, baseName } = parseDesignationLine(line);
    if (!baseName) continue;
    const slug = slugify(baseName);
    if (!groups.has(slug)) {
      groups.set(slug, { name: baseName, seniorities: new Set() });
    }
    groups.get(slug)!.seniorities.add(seniority);
  }
  return Array.from(groups.entries()).map(([slug, group]) => ({
    name: group.name,
    slug,
    seniorityLevels: Array.from(group.seniorities),
  }));
}

// A small built-in list of common skill/practice terms — everything else
// defaults to `technology`. Only consulted for genuinely new names; an
// existing catalog row's stored classification always wins over this guess.
const SKILL_KEYWORD_HINTS = new Set([
  'communication', 'system design', 'agile', 'ci/cd', 'leadership', 'mentoring',
  'code review', 'incident response', 'stakeholder management', 'technical writing',
  'problem solving', 'collaboration', 'presentation skills', 'architecture',
  'testing strategy', 'devops culture', 'observability strategy', 'project management',
  'scrum', 'kanban', 'negotiation', 'time management',
]);

function guessKind(name: string): 'skill' | 'technology' {
  return SKILL_KEYWORD_HINTS.has(name.trim().toLowerCase()) ? 'skill' : 'technology';
}

const UNCATEGORIZED_SENTINEL = '__new__';

export default function TaxonomyTab(): React.JSX.Element {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const { supabase } = useAuth();

  const [catalog, setCatalog] = useState<TaxonomyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);

  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [designationsInput, setDesignationsInput] = useState('');
  const [itemsInput, setItemsInput] = useState('');

  const [classificationOverrides, setClassificationOverrides] = useState<Record<string, 'skill' | 'technology'>>({});
  const [categorySelections, setCategorySelections] = useState<Record<string, string>>({});
  const [newCategoryNames, setNewCategoryNames] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTaxonomy(apiBaseUrl);
      setCatalog(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load taxonomy');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const rolePreview = useMemo<RolePreviewRow[]>(() => {
    if (!catalog) return [];
    return collapseDesignations(designationsInput).map((role) => {
      const existing = catalog.roles.find((r) => r.slug === role.slug);
      const linkedDomainNames = existing
        ? catalog.domains.filter((d) => d.roleIds.includes(existing.id)).map((d) => d.name)
        : [];
      return { ...role, existingId: existing?.id ?? null, linkedDomainNames };
    });
  }, [designationsInput, catalog]);

  const itemPreview = useMemo<ItemPreviewRow[]>(() => {
    if (!catalog) return [];
    const seenSlugs = new Set<string>();
    const rows: ItemPreviewRow[] = [];
    for (const line of parseLines(itemsInput)) {
      const slug = slugify(line);
      if (!slug || seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);

      const existingSkill = catalog.skills.find((s) => s.slug === slug);
      const existingTech = catalog.technologies.find((t) => t.slug === slug);

      let kind: 'skill' | 'technology';
      let existingId: string | null = null;
      let existingCategoryId: string | null = null;

      if (existingSkill) {
        kind = 'skill';
        existingId = existingSkill.id;
      } else if (existingTech) {
        kind = 'technology';
        existingId = existingTech.id;
        existingCategoryId = existingTech.categoryId;
      } else {
        kind = classificationOverrides[slug] ?? guessKind(line);
      }

      const linkedDomainNames = existingId
        ? catalog.domains
            .filter((d) => (kind === 'skill' ? d.skillIds : d.technologyIds).includes(existingId as string))
            .map((d) => d.name)
        : [];

      rows.push({
        name: line,
        slug,
        kind,
        existingId,
        existingCategoryId,
        linkedDomainNames,
        isExisting: Boolean(existingId),
      });
    }
    return rows;
  }, [itemsInput, catalog, classificationOverrides]);

  function toggleClassification(slug: string, current: 'skill' | 'technology'): void {
    setClassificationOverrides((prev) => ({ ...prev, [slug]: current === 'skill' ? 'technology' : 'skill' }));
  }

  function resolveCategorySelection(item: ItemPreviewRow): string {
    if (categorySelections[item.slug] !== undefined) return categorySelections[item.slug];
    if (item.existingCategoryId) return item.existingCategoryId;
    const uncategorized = catalog?.technologyCategories.find((c) => c.slug === 'uncategorized');
    return uncategorized?.id ?? '';
  }

  function resetForm(): void {
    setEditingDomainId(null);
    setCategoryNameInput('');
    setDesignationsInput('');
    setItemsInput('');
    setClassificationOverrides({});
    setCategorySelections({});
    setNewCategoryNames({});
    setSaveError(null);
    setSaveSuccess(false);
  }

  function startNewCategory(): void {
    resetForm();
    setMode('form');
  }

  function loadDomainIntoForm(domain: TaxonomyDomain): void {
    if (!catalog) return;
    resetForm();
    setEditingDomainId(domain.id);
    setCategoryNameInput(domain.name);

    const roleLines: string[] = [];
    domain.roleIds.forEach((roleId) => {
      const role = catalog.roles.find((r) => r.id === roleId);
      if (!role) return;
      role.seniorityLevels.forEach((level) => {
        const prefixEntry = SENIORITY_PREFIXES.find((p) => p.value === level);
        roleLines.push(prefixEntry ? `${capitalize(prefixEntry.prefix)} ${role.name}` : role.name);
      });
    });
    setDesignationsInput(roleLines.join('\n'));

    const itemLines: string[] = [];
    domain.skillIds.forEach((skillId) => {
      const skill = catalog.skills.find((s) => s.id === skillId);
      if (skill) itemLines.push(skill.name);
    });
    domain.technologyIds.forEach((technologyId) => {
      const tech = catalog.technologies.find((t) => t.id === technologyId);
      if (tech) itemLines.push(tech.name);
    });
    setItemsInput(itemLines.join('\n'));

    setMode('form');
  }

  async function handleConfirmSave(): Promise<void> {
    if (!catalog || !categoryNameInput.trim()) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const payload = {
      domain: { name: categoryNameInput.trim() },
      roles: rolePreview.map((role) => ({ name: role.name, seniorityLevels: role.seniorityLevels })),
      skills: itemPreview.filter((item) => item.kind === 'skill').map((item) => ({ name: item.name })),
      technologies: itemPreview
        .filter((item) => item.kind === 'technology')
        .map((item) => {
          const selection = resolveCategorySelection(item);
          if (selection === UNCATEGORIZED_SENTINEL) {
            return { name: item.name, categoryName: (newCategoryNames[item.slug] || '').trim() || 'Uncategorized' };
          }
          return { name: item.name, categoryId: selection };
        }),
    };

    const { error: saveErr } = await saveTaxonomyCategory(supabase, payload);
    setSaving(false);
    if (saveErr) {
      setSaveError(saveErr);
      return;
    }
    setSaveSuccess(true);
    await fetchCatalog();
    resetForm();
    setMode('list');
  }

  if (loading) {
    return (
      <div className={manageAccessStyles.loadingState}>
        <div className={manageAccessStyles.spinner} />
        <p>Loading taxonomy...</p>
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className={manageAccessStyles.errorState}>
        <p className={manageAccessStyles.errorText}>{error ?? 'Failed to load taxonomy'}</p>
        <button type="button" className={manageAccessStyles.retryBtn} onClick={fetchCatalog}>
          Retry
        </button>
      </div>
    );
  }

  if (mode === 'list') {
    return (
      <>
        <div className={manageAccessStyles.adminNote}>
          Paste a category name plus its designations and skills/technologies to build the catalog. Existing
          categories can be reopened and edited below.
        </div>
        <div className={manageAccessStyles.roleGrid}>
          <button type="button" className={manageAccessStyles.roleCard} onClick={startNewCategory}>
            <span className={manageAccessStyles.roleCardLabel}>+ New Category</span>
          </button>
          {catalog.domains.map((domain) => (
            <button
              type="button"
              key={domain.id}
              className={manageAccessStyles.roleCard}
              onClick={() => loadDomainIntoForm(domain)}
            >
              <span className={manageAccessStyles.roleCardLabel}>{domain.name}</span>
              <span className={manageAccessStyles.roleCardCount}>
                {domain.roleIds.length} roles · {domain.skillIds.length} skills · {domain.technologyIds.length} tech
              </span>
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
        ← Back to categories
      </button>

      <div className={manageAccessStyles.fieldLabel}>
        <label htmlFor="taxonomy-category-name">Category name</label>
      </div>
      <input
        id="taxonomy-category-name"
        type="text"
        className={manageAccessStyles.searchInput}
        value={categoryNameInput}
        onChange={(e) => setCategoryNameInput(e.target.value)}
        placeholder="MLOps"
      />

      <div className={styles.columns}>
        <div className={styles.column}>
          <label className={manageAccessStyles.fieldLabel} htmlFor="taxonomy-designations">
            Designations (one per line)
          </label>
          <textarea
            id="taxonomy-designations"
            className={styles.textarea}
            rows={8}
            value={designationsInput}
            onChange={(e) => setDesignationsInput(e.target.value)}
            placeholder={'MLOps Engineer\nSenior MLOps Engineer\nStaff MLOps Engineer'}
          />

          {rolePreview.length > 0 && (
            <div className={styles.previewList}>
              {rolePreview.map((role) => (
                <div key={role.slug} className={styles.previewRow}>
                  <div className={styles.previewRowMain}>
                    <span className={styles.previewName}>{role.name}</span>
                    <div className={styles.badgeRow}>
                      {role.seniorityLevels.map((level) => (
                        <span key={level} className={styles.badge}>
                          {level}
                        </span>
                      ))}
                    </div>
                  </div>
                  {role.existingId ? (
                    <p className={styles.existingNote}>
                      Existing role — already linked to:{' '}
                      {role.linkedDomainNames.length ? role.linkedDomainNames.join(', ') : 'no other categories'}
                    </p>
                  ) : (
                    <p className={styles.newNote}>New role</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.column}>
          <label className={manageAccessStyles.fieldLabel} htmlFor="taxonomy-items">
            Skills / technologies (one per line)
          </label>
          <textarea
            id="taxonomy-items"
            className={styles.textarea}
            rows={8}
            value={itemsInput}
            onChange={(e) => setItemsInput(e.target.value)}
            placeholder={'Python\nKubernetes\nMLflow\nModel Drift'}
          />

          {itemPreview.length > 0 && (
            <div className={styles.previewList}>
              {itemPreview.map((item) => (
                <div key={item.slug} className={styles.previewRow}>
                  <div className={styles.previewRowMain}>
                    <span className={styles.previewName}>{item.name}</span>
                    <div className={styles.badgeRow}>
                      <span className={item.kind === 'skill' ? styles.badgeSkill : styles.badgeTechnology}>
                        {item.kind}
                      </span>
                      {!item.isExisting && (
                        <button
                          type="button"
                          className={styles.toggleBtn}
                          onClick={() => toggleClassification(item.slug, item.kind)}
                        >
                          Mark as {item.kind === 'skill' ? 'technology' : 'skill'}
                        </button>
                      )}
                    </div>
                  </div>

                  {item.isExisting ? (
                    <p className={styles.existingNote}>
                      Existing {item.kind} — already linked to:{' '}
                      {item.linkedDomainNames.length ? item.linkedDomainNames.join(', ') : 'no other categories'}
                    </p>
                  ) : (
                    <p className={styles.newNote}>New {item.kind}</p>
                  )}

                  {item.kind === 'technology' && (
                    <div className={styles.categoryRow}>
                      <select
                        className={styles.categorySelect}
                        value={resolveCategorySelection(item)}
                        onChange={(e) =>
                          setCategorySelections((prev) => ({ ...prev, [item.slug]: e.target.value }))
                        }
                      >
                        {catalog.technologyCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                        <option value={UNCATEGORIZED_SENTINEL}>+ Add new category…</option>
                      </select>
                      {resolveCategorySelection(item) === UNCATEGORIZED_SENTINEL && (
                        <input
                          type="text"
                          className={styles.newCategoryInput}
                          value={newCategoryNames[item.slug] ?? ''}
                          onChange={(e) =>
                            setNewCategoryNames((prev) => ({ ...prev, [item.slug]: e.target.value }))
                          }
                          placeholder="New category name"
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.saveBar}>
        <button
          type="button"
          className={manageAccessStyles.retryBtn}
          disabled={saving || !categoryNameInput.trim()}
          onClick={handleConfirmSave}
        >
          {saving ? 'Saving…' : editingDomainId ? 'Confirm & Save Changes' : 'Confirm & Save'}
        </button>
        {saveError && <p className={manageAccessStyles.errorText}>{saveError}</p>}
        {saveSuccess && !saveError && <p className={styles.successMessage}>Saved.</p>}
      </div>
    </div>
  );
}

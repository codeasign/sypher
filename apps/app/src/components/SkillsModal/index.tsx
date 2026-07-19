'use client';

import React, { useEffect, useState } from 'react';
import styles from './styles.module.css';

interface SkillOption {
  id: string;
  name: string;
}

interface SkillsModalProps {
  open: boolean;
  onClose: () => void;
  allSkills: SkillOption[];
  selectedSkillIds: string[];
  onSave: (skillIds: string[]) => void;
}

export default function SkillsModal({
  open,
  onClose,
  allSkills,
  selectedSkillIds,
  onSave,
}: SkillsModalProps): React.JSX.Element | null {
  const [search, setSearch] = useState('');
  const [draftSelected, setDraftSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setDraftSelected(new Set(selectedSkillIds));
      setSearch('');
    }
  }, [open, selectedSkillIds]);

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const filteredSkills = allSkills.filter((skill) =>
    skill.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  function toggleSkill(skillId: string): void {
    setDraftSelected((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  }

  function handleSave(): void {
    onSave([...draftSelected]);
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="skills-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="skills-modal-title" className={styles.title}>Skills</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {allSkills.length === 0 ? (
          <p className={styles.helpText}>Select a Current Role first to see relevant skills.</p>
        ) : (
          <>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search skills…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className={styles.skillList}>
              {filteredSkills.length === 0 ? (
                <p className={styles.helpText}>No skills match your search.</p>
              ) : (
                filteredSkills.map((skill) => (
                  <label key={skill.id} className={styles.skillOption}>
                    <input
                      type="checkbox"
                      checked={draftSelected.has(skill.id)}
                      onChange={() => toggleSkill(skill.id)}
                    />
                    {skill.name}
                  </label>
                ))
              )}
            </div>
          </>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>
            Save{draftSelected.size ? ` (${draftSelected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

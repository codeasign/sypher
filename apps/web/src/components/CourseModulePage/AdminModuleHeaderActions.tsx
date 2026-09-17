'use client';

import React from 'react';
import { useAdminModuleEdit } from './AdminModuleEditContext';
import styles from './styles.module.css';

function EditIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

// Edit/Cancel/Save controls, placed in the sticky header before Bookmark
// (user request 2026-09-15) — reads/drives AdminModuleEditProvider's shared
// state so the toggle also swaps the article body below into the editor.
export default function AdminModuleHeaderActions(): React.JSX.Element | null {
  const { canEdit, canPublishDirectly, editing, saving, contentMarkdown, startEditing, cancelEditing, handleSave } = useAdminModuleEdit();

  if (!canEdit) return null;

  if (!editing) {
    return (
      <button type="button" className={styles.adminEditBtn} onClick={startEditing}>
        <EditIcon />
        Edit content
      </button>
    );
  }

  const saveLabel = canPublishDirectly ? 'Save' : 'Submit for review';

  return (
    <>
      <button type="button" className={styles.adminCancelBtn} onClick={cancelEditing} disabled={saving}>
        Cancel
      </button>
      <button type="button" className={styles.adminSaveBtn} onClick={handleSave} disabled={saving || contentMarkdown.trim().length === 0}>
        {saving ? 'Saving…' : saveLabel}
      </button>
    </>
  );
}

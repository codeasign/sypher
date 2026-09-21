'use client';

import { PenLine } from 'lucide-react';
import React from 'react';
import { useAdminModuleEdit } from './AdminModuleEditContext';
import styles from './styles.module.css';

function EditIcon(): React.JSX.Element {
  return (
    <PenLine size={14} />
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

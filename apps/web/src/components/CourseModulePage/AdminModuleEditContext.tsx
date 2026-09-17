'use client';

import React, { createContext, useContext, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import { updateCourseModule } from '@/data/courses';
import { submitModuleEditRequest } from '@/data/moduleEditRequests';
import { useToast } from '@/components/Toast/ToastProvider';

interface AdminModuleEditState {
  canEdit: boolean;
  canPublishDirectly: boolean;
  courseId: string;
  moduleId: string;
  title: string;
  content: string;
  editing: boolean;
  saving: boolean;
  error: string | null;
  draftMarkdown: string;
  contentMarkdown: string;
  editorInstanceKey: number;
  editorRef: React.RefObject<MDXEditorMethods | null>;
  startEditing: () => void;
  cancelEditing: () => void;
  handleSave: () => Promise<void>;
  setContentMarkdown: (markdown: string) => void;
  setError: (error: string | null) => void;
}

const AdminModuleEditContext = createContext<AdminModuleEditState | null>(null);

interface AdminModuleEditProviderProps {
  canEdit: boolean;
  // ADMIN only — everyone else who canEdit (Reviewer included) can only
  // submit a ModuleEditRequest for a Course Auditor to approve (user
  // request 2026-09-16), not write module content directly.
  canPublishDirectly: boolean;
  courseId: string;
  moduleId: string;
  title: string;
  content: string;
  children: React.ReactNode;
}

// Shared edit state for the module reader page's admin controls — split
// across two locations in the DOM tree (the fixed header toolbar and the
// article body), so a context is simpler than prop-drilling through
// page.tsx's server-rendered layout.
export function AdminModuleEditProvider({ canEdit, canPublishDirectly, courseId, moduleId, title, content, children }: AdminModuleEditProviderProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftMarkdown, setDraftMarkdown] = useState(content);
  const [contentMarkdown, setContentMarkdown] = useState(content);
  const [editorInstanceKey, setEditorInstanceKey] = useState(0);
  const editorRef = useRef<MDXEditorMethods>(null);
  const router = useRouter();
  const { showToast } = useToast();

  function startEditing(): void {
    setDraftMarkdown(content);
    setContentMarkdown(content);
    setEditorInstanceKey((key) => key + 1);
    setError(null);
    setEditing(true);
  }

  function cancelEditing(): void {
    setEditing(false);
    setError(null);
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    setError(null);
    const bodyMdx = editorRef.current?.getMarkdown() ?? contentMarkdown;
    try {
      if (canPublishDirectly) {
        const { error: updateError } = await updateCourseModule(courseId, moduleId, { bodyMdx });
        if (updateError) {
          setError(updateError);
          return;
        }
        setEditing(false);
        showToast('Course content updated.', 'success');
        // page.tsx is a Server Component — mod.bodyMdx (this provider's
        // `content` prop) only reflects the DB write after the server
        // tree re-runs, same fix as the module-progress/bookmark stale-UI
        // bug (memory: router.refresh() after complete/bookmark writes).
        router.refresh();
      } else {
        const { error: submitError } = await submitModuleEditRequest(courseId, moduleId, bodyMdx);
        if (submitError) {
          setError(submitError);
          return;
        }
        setEditing(false);
        showToast('Submitted for review. A Course Auditor will approve it before it goes live.', 'info');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModuleEditContext.Provider
      value={{
        canEdit,
        canPublishDirectly,
        courseId,
        moduleId,
        title,
        content,
        editing,
        saving,
        error,
        draftMarkdown,
        contentMarkdown,
        editorInstanceKey,
        editorRef,
        startEditing,
        cancelEditing,
        handleSave,
        setContentMarkdown,
        setError,
      }}
    >
      {children}
    </AdminModuleEditContext.Provider>
  );
}

export function useAdminModuleEdit(): AdminModuleEditState {
  const ctx = useContext(AdminModuleEditContext);
  if (!ctx) throw new Error('useAdminModuleEdit must be used within AdminModuleEditProvider');
  return ctx;
}

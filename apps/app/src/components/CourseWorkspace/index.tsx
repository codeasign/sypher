'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';
import CourseEditor from '@/components/CourseEditor';
import { getCourseById } from '@/data/courses';
import ModulesTab from './ModulesTab';
import AccessTab from './AccessTab';
import { trackEvent } from '@/lib/analytics';
import styles from './styles.module.css';

interface CourseSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  status: 'draft' | 'published';
  updated_at: string;
  published_at: string | null;
  created_at: string;
}

interface CourseWorkspaceProps {
  course: CourseSummary;
  onBack: () => void;
  onCourseUpdated: (course: CourseSummary) => void;
}

type Tab = 'details' | 'modules' | 'access';

export default function CourseWorkspace({ course, onBack, onCourseUpdated }: CourseWorkspaceProps): React.JSX.Element {
  const { supabase } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('details');

  function selectTab(tab: Tab): void {
    setActiveTab(tab);
    trackEvent('managecourses_workspace_tab_switch', { course_id: course.id, tab });
  }

  async function handleDetailsSaved(): Promise<void> {
    const updated = await getCourseById(supabase, course.id);
    if (updated) onCourseUpdated(updated);
  }

  return (
    <div className={styles.workspace}>
      <button type="button" className={styles.backBtn} onClick={onBack}>
        ← Back to courses
      </button>

      <div className={styles.header}>
        <div>
          <h2 className={styles.heading}>{course.name}</h2>
          <span className={clsx(styles.statusBadge, course.status === 'published' ? styles.statusPublished : styles.statusDraft)}>
            {course.status === 'published' ? 'Published' : 'Draft'}
          </span>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          className={activeTab === 'details' ? clsx(styles.tab, styles.tabActive) : styles.tab}
          onClick={() => selectTab('details')}
        >
          Details
        </button>
        <button
          type="button"
          className={activeTab === 'modules' ? clsx(styles.tab, styles.tabActive) : styles.tab}
          onClick={() => selectTab('modules')}
        >
          Modules
        </button>
        <button
          type="button"
          className={activeTab === 'access' ? clsx(styles.tab, styles.tabActive) : styles.tab}
          onClick={() => selectTab('access')}
        >
          Access
        </button>
      </div>

      {activeTab === 'details' && (
        <CourseEditor course={course} onSaved={handleDetailsSaved} onCancel={onBack} />
      )}
      {activeTab === 'modules' && <ModulesTab courseId={course.id} courseSlug={course.slug} />}
      {activeTab === 'access' && <AccessTab courseId={course.id} />}
    </div>
  );
}

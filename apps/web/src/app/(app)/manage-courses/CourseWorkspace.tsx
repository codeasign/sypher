'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { getCourse, type Course } from '@/data/courses';
import CourseEditor from './CourseEditor';
import ModulesTab from './ModulesTab';
import AccessTab from './AccessTab';
import styles from './manage-courses.module.css';

interface CourseWorkspaceProps {
  course: Course;
  onBack: () => void;
  onCourseUpdated: (course: Course) => void;
}

type Tab = 'details' | 'modules' | 'access';

export default function CourseWorkspace({ course, onBack, onCourseUpdated }: CourseWorkspaceProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('details');

  async function handleDetailsSaved(): Promise<void> {
    const updated = await getCourse(course.id);
    if (updated) onCourseUpdated(updated);
  }

  return (
    <div className={styles.workspace}>
      <button type="button" className={styles.backBtn} onClick={onBack}>
        ← Back to courses
      </button>

      <div className={styles.workspaceHeader}>
        <h2 className={styles.workspaceHeading}>{course.name}</h2>
        <span className={clsx(styles.statusBadge, course.status === 'published' ? styles.statusPublished : styles.statusDraft)}>
          {course.status === 'published' ? 'Published' : 'Draft'}
        </span>
      </div>

      <div className={styles.tabBar}>
        <button
          type="button"
          className={activeTab === 'details' ? clsx(styles.tab, styles.tabActive) : styles.tab}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          type="button"
          className={activeTab === 'modules' ? clsx(styles.tab, styles.tabActive) : styles.tab}
          onClick={() => setActiveTab('modules')}
        >
          Modules
        </button>
        <button
          type="button"
          className={activeTab === 'access' ? clsx(styles.tab, styles.tabActive) : styles.tab}
          onClick={() => setActiveTab('access')}
        >
          Access
        </button>
      </div>

      {activeTab === 'details' && <CourseEditor course={course} onSaved={handleDetailsSaved} onCancel={onBack} />}
      {activeTab === 'modules' && <ModulesTab courseId={course.id} />}
      {activeTab === 'access' && <AccessTab courseId={course.id} />}
    </div>
  );
}

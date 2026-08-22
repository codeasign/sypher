'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Course } from '@/data/courses';
import { CourseBookmarkButton, ModuleBookmarkButton } from '@/components/AuthoredBookmarkButton';
import styles from './styles.module.css';

export interface BookmarkedModule {
  id: string;
  slug: string;
  title: string;
  courseId: string;
  course: { slug: string; name: string };
}

interface BookmarksContentProps {
  initialCourses: Course[];
  initialModules: BookmarkedModule[];
}

export default function BookmarksContent({ initialCourses, initialModules }: BookmarksContentProps): React.JSX.Element {
  const [courses, setCourses] = useState(initialCourses);
  const [modules, setModules] = useState(initialModules);

  function handleCourseChange(courseId: string, bookmarked: boolean): void {
    if (!bookmarked) setCourses((prev) => prev.filter((c) => c.id !== courseId));
  }

  function handleModuleChange(moduleId: string, bookmarked: boolean): void {
    if (!bookmarked) setModules((prev) => prev.filter((m) => m.id !== moduleId));
  }

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>My Courses</h2>
        {courses.length === 0 ? (
          <p className={styles.emptyText}>No bookmarked courses yet.</p>
        ) : (
          <div className={styles.courseGrid}>
            {courses.map((course) => (
              <div key={course.id} className={styles.courseCardWrapper}>
                <Link href={`/learn/${course.slug}`} className={styles.courseCard}>
                  {course.coverImageUrl && <img src={course.coverImageUrl} alt={course.name} className={styles.courseCardImage} />}
                  <div className={styles.courseCardBody}>
                    <h3 className={styles.courseCardTitle}>{course.name}</h3>
                    {course.description && <p className={styles.courseCardDescription}>{course.description}</p>}
                  </div>
                </Link>
                <div className={styles.bookmarkSlot}>
                  <CourseBookmarkButton courseId={course.id} initialBookmarked onChange={(b) => handleCourseChange(course.id, b)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>My Course Modules</h2>
        {modules.length === 0 ? (
          <p className={styles.emptyText}>No bookmarked modules yet.</p>
        ) : (
          <ul className={styles.moduleList}>
            {modules.map((mod) => (
              <li key={mod.id} className={styles.moduleRow}>
                <Link href={`/learn/${mod.course.slug}/${mod.slug}`} className={styles.moduleLink}>
                  <span className={styles.moduleTitle}>{mod.title}</span>
                  <span className={styles.moduleCourseName}>{mod.course.name}</span>
                </Link>
                <ModuleBookmarkButton
                  moduleId={mod.id}
                  courseId={mod.courseId}
                  initialBookmarked
                  onChange={(b) => handleModuleChange(mod.id, b)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

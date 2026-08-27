'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CourseModule, CourseWithAccess } from '@/data/courses';
import { BookIcon, LockIcon } from '@/components/icons/SidebarIcons';
import styles from './styles.module.css';

interface CourseModuleIndexProps {
  courseSlug: string;
  courseName: string;
  courses: CourseWithAccess[];
  modules: CourseModule[];
}

interface Group {
  label: string | null;
  modules: CourseModule[];
}

// Modules already arrive ordered by orderIndex — this only groups
// adjacent modules sharing the same sectionLabel, it never re-sorts. A
// run of sectionLabel: null modules (flat courses, or the synthetic
// "Course Overview" module) forms its own unlabeled group rather than
// merging into a neighboring labeled one.
function groupBySection(modules: CourseModule[]): Group[] {
  const groups: Group[] = [];
  for (const mod of modules) {
    const last = groups[groups.length - 1];
    if (last && last.label === mod.sectionLabel) {
      last.modules.push(mod);
    } else {
      groups.push({ label: mod.sectionLabel, modules: [mod] });
    }
  }
  return groups;
}

// Replaces DashboardSidebar for the whole /learn/[slug] subtree (see
// learn/[slug]/layout.tsx). Context-dependent, confirmed 2026-08-22: on
// the course home page it's a course switcher (browse every other
// course, each linking to its own home page, lock icon on ones without
// full access); the moment you click into an actual module it switches
// to that course's own outline instead — grouped by sectionLabel, a green
// dot per completed module (see ModuleProgress), a lock badge on modules
// beyond the free preview. Client component specifically so it can read
// the current URL itself via usePathname() to decide which view to show
// and which module (if any) is current — the layout only has the course
// `slug` param, not `moduleSlug`.
export default function CourseModuleIndex({ courseSlug, courseName, courses, modules }: CourseModuleIndexProps): React.JSX.Element {
  const pathname = usePathname();
  const currentModuleSlug = pathname.startsWith(`/learn/${courseSlug}/`) ? pathname.slice(`/learn/${courseSlug}/`.length).split('/')[0] : null;
  const showModuleOutline = currentModuleSlug !== null;

  return (
    <nav className={styles.index} aria-label={showModuleOutline ? 'Course modules' : 'Courses'}>
      <div className={styles.courseName}>
        <BookIcon className={styles.bookIcon} />
        <span>{courseName}</span>
      </div>

      {showModuleOutline ? (
        <ol className={`${styles.list} ${styles.scrollable}`}>
          {groupBySection(modules).map((group, groupIdx) => (
            <li key={group.label ?? `ungrouped-${groupIdx}`}>
              {group.label && <div className={styles.sectionLabel}>{group.label}</div>}
              <ol className={styles.groupList}>
                {group.modules.map((mod) => {
                  const isCurrent = mod.slug === currentModuleSlug;
                  return (
                    <li key={mod.id}>
                      <Link
                        href={`/learn/${courseSlug}/${mod.slug}`}
                        className={isCurrent ? `${styles.entryLeft} ${styles.entryCurrent}` : styles.entryLeft}
                        aria-current={isCurrent ? 'page' : undefined}
                      >
                        <span className={mod.completed ? `${styles.dot} ${styles.dotComplete}` : styles.dot} aria-hidden="true" />
                        <span className={styles.title}>{mod.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
      ) : (
        <ol className={styles.list}>
          {courses.map((course) => {
            const isCurrentCourse = course.slug === courseSlug;
            return (
              <li key={course.id}>
                <Link
                  href={`/learn/${course.slug}`}
                  className={isCurrentCourse ? `${styles.entry} ${styles.entryCurrent}` : styles.entry}
                  aria-current={isCurrentCourse ? 'page' : undefined}
                >
                  <span className={styles.title}>{course.name}</span>
                  {!course.hasFullAccess && <LockIcon className={styles.lockIcon} />}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
}

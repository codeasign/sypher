import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useAuth } from '@site/src/contexts/AuthContext';
import { fetchCourseAccessRows, hasCourseAccess } from '@site/src/data/courseAccess';
import { fetchCompanyCourseAccessRows } from '@site/src/data/companyAccess';
import ProUpgradeModal from '@site/src/components/ProUpgradeModal';
import { useBookmarks } from '@site/src/hooks/useBookmarks';
import styles from './CourseDetail.module.css';

export default function CourseDetail({ course, docUrl }) {
  const { siteConfig } = useDocusaurusContext();
  const { showDurationOnContent } = siteConfig.customFields;
  const { user, role, supabase, companyName } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [openModules, setOpenModules] = useState(() => new Set([0, 1]));
  const [isFree, setIsFree] = useState(null);
  const [companyAllowedSlugs, setCompanyAllowedSlugs] = useState(new Set());
  const [showProModal, setShowProModal] = useState(false);
  const startUrl = user ? docUrl : `/login?redirect=${encodeURIComponent(docUrl)}`;

  useEffect(() => {
    if (role !== 'company_employees' || !companyName) return;
    fetchCompanyCourseAccessRows(supabase, companyName).then(setCompanyAllowedSlugs);
  }, [supabase, role, companyName]);

  useEffect(() => {
    fetchCourseAccessRows(supabase).then((rows) => {
      const row = rows.find((r) => r.course_slug === course.slug);
      setIsFree(hasCourseAccess(role, row?.allowed_roles ?? [], { slug: course.slug, companyAllowedSlugs }));
    });
  }, [course.slug, role, supabase, companyAllowedSlugs]);

  function handleStartLearning(event) {
    if (isFree === false) {
      event.preventDefault();
      setShowProModal(true);
    }
  }

  const toggleModule = (i) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* Back link */}
        <Link to="/courses" className={styles.backLink}>← All Courses</Link>

        {/* Hero */}
        <div className={styles.hero} style={{ '--course-gradient': course.gradient }}>
          <div className={styles.heroBg} />
          <div className={styles.heroContent}>
            <span className={styles.heroIcon}>{course.icon}</span>
            <div className={styles.heroText}>
              <div className={styles.heroTop}>
                <Heading as="h1" className={styles.heroTitle}>{course.title}</Heading>
                <span className={styles.heroTag}>{course.tag}</span>
                {user && (
                  <button
                    type="button"
                    className={styles.bookmarkBtn}
                    aria-label={isBookmarked(course.slug) ? 'Remove bookmark' : 'Add bookmark'}
                    aria-pressed={isBookmarked(course.slug)}
                    onClick={() => toggleBookmark(course.slug)}
                  >
                    <BookmarkGlyph filled={isBookmarked(course.slug)} />
                  </button>
                )}
              </div>
              <div className={styles.heroMeta}>
                <span>{course.difficulty}</span>
                {showDurationOnContent && (
                  <>
                    <span className={styles.metaDot}>·</span>
                    <span>{course.hours}</span>
                  </>
                )}
              </div>
              <p className={styles.heroDesc}>{course.longDesc || course.description}</p>
              <Link to={startUrl} className={styles.startBtn} onClick={handleStartLearning}>
                Start Learning →
              </Link>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{course.modules.length}</span>
            <span className={styles.statLabel}>Sections</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{course.modules.reduce((s, m) => s + m.topics.length, 0)}</span>
            <span className={styles.statLabel}>Topics</span>
          </div>
          {showDurationOnContent && (
            <div className={styles.stat}>
              <span className={styles.statValue}>{course.hours}</span>
              <span className={styles.statLabel}>Duration</span>
            </div>
          )}
        </div>

        {/* System Under Test */}
        {course.sut && (
          <div className={styles.sutSection}>
            <div className={styles.sutHeader}>
              <Heading as="h2" className={styles.sutTitle}>{course.sut.label}</Heading>
              <a
                href={course.sut.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sutRepoLink}
              >
                <GitHubGlyph />
                {course.sut.repoName}
              </a>
            </div>
            <p className={styles.sutDesc}>{course.sut.description}</p>
            {course.sut.cloneCommand && (
              <pre className={styles.sutClone}><code>{course.sut.cloneCommand}</code></pre>
            )}
            <ol className={styles.sutSteps}>
              {course.sut.steps.map((step, i) => (
                <li key={i} className={styles.sutStep}>{step}</li>
              ))}
            </ol>
            {course.sut.screenshots && course.sut.screenshots.length > 0 && (
              <div className={styles.sutScreenshots}>
                {course.sut.screenshots.map((shot) => (
                  <figure key={shot.src} className={styles.sutScreenshot}>
                    <img src={shot.src} alt={shot.alt} loading="lazy" />
                    <figcaption>{shot.caption}</figcaption>
                  </figure>
                ))}
              </div>
            )}
            {course.sut.docsLink && (
              <Link to={course.sut.docsLink} className={styles.sutDocsLink}>
                Full walkthrough in Setup →
              </Link>
            )}
          </div>
        )}

        {/* Curriculum — full breakdown only for signed-in users; anonymous
            visitors get the outcome summary plus a sign-in prompt, so the
            exact module/lesson list isn't public. */}
        {user ? (
          <div className={styles.curriculumSection}>
            <div className={styles.curriculumHeader}>
              <Heading as="h2" className={styles.curriculumTitle}>Course Curriculum</Heading>
              <span className={styles.curriculumSub}>
                {course.modules.reduce((s, m) => s + m.topics.length, 0)} topics across {course.modules.length} sections
              </span>
            </div>

            <div className={styles.curriculumList}>
              {course.modules.map((mod, i) => (
                <div key={i} className={styles.module}>
                  <button
                    className={styles.moduleSummary}
                    onClick={() => toggleModule(i)}
                    aria-expanded={openModules.has(i)}
                  >
                    <span className={`${styles.moduleArrow} ${openModules.has(i) ? styles.moduleArrowOpen : ''}`}>▶</span>
                    <span className={styles.moduleLabel}>{mod.label}</span>
                    <span className={styles.moduleCount}>{mod.topics.length}</span>
                  </button>
                  {openModules.has(i) && (
                    <div className={styles.moduleTopics}>
                      {mod.topics.map((topic) => (
                        <div key={topic} className={styles.topicItem}>
                          <span className={styles.topicDot}>●</span>
                          <span>{topic}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.curriculumSection}>
            <div className={styles.curriculumHeader}>
              <Heading as="h2" className={styles.curriculumTitle}>What You&apos;ll Learn</Heading>
              <span className={styles.curriculumSub}>
                {course.modules.length} sections · {course.modules.reduce((s, m) => s + m.topics.length, 0)} topics
              </span>
            </div>
            <div className={styles.outcomeLocked}>
              <ul className={styles.outcomeList}>
                {course.outcomes.map((outcome) => (
                  <li key={outcome} className={styles.outcomeItem}>
                    <CheckGlyph />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
              <Link to={startUrl} className={styles.unlockLink} onClick={handleStartLearning}>
                Sign in to see the full lesson-by-lesson curriculum →
              </Link>
            </div>
          </div>
        )}
      </div>

      <ProUpgradeModal open={showProModal} onClose={() => setShowProModal(false)} />
    </div>
  );
}

function GitHubGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.66.5 12.03c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.7-1.28-1.7-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.34.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a10.9 10.9 0 0 1 5.8 0c2.2-1.5 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.2.66.79.55A10.53 10.53 0 0 0 23.5 12.03C23.5 5.66 18.35.5 12 .5z" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function BookmarkGlyph({ filled }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
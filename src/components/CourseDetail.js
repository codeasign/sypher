import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useAuth } from '@site/src/contexts/AuthContext';
import { fetchAccessControlConfig } from '@site/src/data/homepageCourses';
import ProUpgradeModal from '@site/src/components/ProUpgradeModal';
import { useBookmarks } from '@site/src/hooks/useBookmarks';
import styles from './CourseDetail.module.css';

export default function CourseDetail({ course, docUrl }) {
  const { siteConfig } = useDocusaurusContext();
  const { showDurationOnContent } = siteConfig.customFields;
  const { user } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [openModules, setOpenModules] = useState(() => new Set([0, 1]));
  const [isFree, setIsFree] = useState(null);
  const [showProModal, setShowProModal] = useState(false);
  const startUrl = user ? docUrl : `/login?redirect=${encodeURIComponent(docUrl)}`;

  useEffect(() => {
    fetchAccessControlConfig().then((cfg) => {
      setIsFree((cfg.freeCourses ?? []).includes(course.slug));
    });
  }, [course.slug]);

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

        {/* Curriculum */}
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
      </div>

      <ProUpgradeModal open={showProModal} onClose={() => setShowProModal(false)} />
    </div>
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
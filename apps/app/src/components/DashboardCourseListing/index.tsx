'use client';

import React, { useState } from 'react';
import CourseSlidePanel from '@/components/CourseSlidePanel';
import { getDocsOrigin } from '@sypher/auth-core/src/urls';
import styles from './styles.module.css';

interface CourseData {
  title: string;
  description: string;
  url: string;
  gradient: string;
  icon: string;
  tag: string;
  isFree: boolean;
  slug: string;
  docsSlug?: string;
  videoId?: string;
  topics?: string[];
  modules?: Array<{ label: string; topics: string[] }>;
}

interface CourseCardProps extends CourseData {
  onOpenPanel: (course: CourseData) => void;
}

function DashboardCourseCard({
  title,
  description,
  url,
  gradient,
  icon,
  tag,
  isFree,
  slug,
  docsSlug,
  videoId,
  topics,
  modules,
  onOpenPanel,
}: CourseCardProps) {
  const course = { title, description, url, gradient, icon, tag, isFree, slug, docsSlug, videoId, topics, modules };

  const cardContent = (
    <>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{icon}</span>
        <div className={styles.cardHeaderRight}>
            <span className={styles.cardTag}>{tag}</span>
        </div>
      </div>
      <h3 className={styles.cardTitle}>{title}</h3>
      <p className={styles.cardDesc}>{description}</p>
      {isFree && (
        <div className={styles.cardActions}>
          <a href={`${getDocsOrigin()}/docs/${docsSlug ?? slug}/`} className={styles.btnPrimary}>
            Learn →
          </a>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={(e) => {
              e.stopPropagation();
              onOpenPanel(course);
            }}
          >
            View Course
          </button>
        </div>
      )}
    </>
  );

  if (isFree) {
    return (
      <article className={styles.card} style={{ '--card-gradient': gradient } as React.CSSProperties}>
        {cardContent}
      </article>
    );
  }

  return (
    <button
      type="button"
      className={styles.cardLink}
      onClick={() => onOpenPanel(course)}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'block',
        width: '100%',
        border: 'none',
        background: 'none',
        padding: 0,
        font: 'inherit',
      }}
    >
      <article className={styles.card} style={{ '--card-gradient': gradient } as React.CSSProperties}>
        {cardContent}
      </article>
    </button>
  );
}

interface DashboardCourseListingProps {
  courses: CourseData[];
}

export default function DashboardCourseListing({
  courses,
}: DashboardCourseListingProps) {
  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  function handleOpenPanel(course: CourseData) {
    setSelectedCourse(course);
    setPanelOpen(true);
  }

  function handleClosePanel() {
    setPanelOpen(false);
  }

  return (
    <>
      <div className={styles.courseGrid}>
        {courses.map((course) => (
          <DashboardCourseCard
            key={course.title}
            {...course}
            onOpenPanel={handleOpenPanel}
          />
        ))}
      </div>
      <CourseSlidePanel
        open={panelOpen}
        onClose={handleClosePanel}
        icon={selectedCourse?.icon}
        title={selectedCourse?.title}
        tag={selectedCourse && <span className={styles.cardTag}>{selectedCourse.tag}</span>}
      >
        {selectedCourse && (
          <div className={styles.panelContent}>
            <div className={styles.panelFixed}>
              <p className={styles.panelDesc}>{selectedCourse.description}</p>
              <br />
              {selectedCourse.videoId && (
                <div className={styles.videoWrapper}>
                  <iframe
                    className={styles.videoIframe}
                    src={`https://www.youtube-nocookie.com/embed/${selectedCourse.videoId}?rel=0&iv_load_policy=3&modestbranding=1&controls=0&loop=1&playlist=${selectedCourse.videoId}`}
                    title={`${selectedCourse.title} overview`}
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              {selectedCourse.modules && selectedCourse.modules.length > 0 && (
                <div className={styles.panelCurriculumHeader}>
                  <h4 className={styles.panelModulesTitle}>Course Curriculum</h4>
                  {selectedCourse.isFree ? (
                    <a
                      href={`${getDocsOrigin()}/docs/${selectedCourse.docsSlug ?? selectedCourse.slug}/`}
                      className={styles.curriculumLearnBtn}
                    >
                      Learn →
                    </a>
                  ) : (
                    <button type="button" className={styles.curriculumGoProBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Go Pro
                    </button>
                  )}
                </div>
              )}
            </div>
            {selectedCourse.modules && selectedCourse.modules.length > 0 && (
              <div className={styles.panelScrollable}>
                {selectedCourse.modules.map((mod) => (
                  <div key={mod.label} className={styles.panelModule}>
                    <span className={styles.panelModuleLabel}>{mod.label}</span>
                    <div className={styles.panelModuleTopics}>
                      {mod.topics.map((t) => (
                        <span key={t} className={styles.topicTag}>{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CourseSlidePanel>
    </>
  );
}
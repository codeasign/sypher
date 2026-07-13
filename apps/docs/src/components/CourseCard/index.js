import React from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

export function CourseCard({ title, description, url, difficulty, hours, topics, gradient, icon, tag, isFree, showDuration, slug, isBookmarked, onToggleBookmark }) {
  return (
    <Link to={url} className={styles.cardLink} style={{ textDecoration: 'none', color: 'inherit' }}>
      <article className={styles.card} style={{ '--card-gradient': gradient }}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}>{icon}</span>
          <div className={styles.cardHeaderRight}>
            {isFree ? (
              <span className={styles.freeTag}>Free</span>
            ) : (
              <span className={styles.cardTag}>{tag}</span>
            )}
            {onToggleBookmark && (
              <button
                type="button"
                className={styles.bookmarkBtn}
                aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                aria-pressed={isBookmarked}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onToggleBookmark(slug);
                }}
              >
                <BookmarkGlyph filled={isBookmarked} />
              </button>
            )}
          </div>
        </div>
        <Heading as="h3" className={styles.cardTitle}>{title}</Heading>
        <p className={styles.cardDesc}>{description}</p>
        {showDuration ? (
          <div className={styles.cardMeta}>
            <span className={styles.metaItem}>{difficulty}</span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaItem}>{hours}</span>
          </div>
        ) : (
          <div className={styles.cardMeta}>
            <span className={styles.metaItem}>{difficulty}</span>
          </div>
        )}
        <div className={styles.cardTopics}>
          {topics.map((topic) => (
            <span key={topic} className={styles.topicTag}>{topic}</span>
          ))}
        </div>
        {isFree ? (
          <span className={styles.enrollBtn}>
            Start Learning →
          </span>
        ) : (
          <span className={styles.enrollBtn}>
            View Course →
          </span>
        )}
      </article>
    </Link>
  );
}

export function CourseGrid({ courses, showDuration, isBookmarked, onToggleBookmark }) {
  return (
    <div className={styles.courseGrid}>
      {courses.map((course) => (
        <CourseCard
          key={course.title}
          {...course}
          showDuration={showDuration}
          isBookmarked={isBookmarked ? isBookmarked(course.slug) : false}
          onToggleBookmark={onToggleBookmark}
        />
      ))}
    </div>
  );
}

function BookmarkGlyph({ filled }) {
  return (
    <svg
      width="16"
      height="16"
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

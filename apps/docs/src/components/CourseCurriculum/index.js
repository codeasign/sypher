import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import { usePluginData } from '@docusaurus/useGlobalData';
import { useAuth } from '@site/src/contexts/AuthContext';
import { fetchCourseAccessRows, hasCourseAccess } from '@site/src/data/courseAccess';
import { fetchCompanyCourseAccessRows } from '@site/src/data/companyAccess';
import styles from './styles.module.css';

const ACRONYMS = new Set([
  'ai', 'llm', 'llms', 'api', 'apis', 'mcp', 'json', 'csv', 'sql', 'http',
  'https', 'rest', 'cli', 'sdk', 'jwt', 'ci', 'cd', 'rag', 'ui', 'ux', 'qa',
]);

// docId is always "<courseSlug>/<topic>/<page>", except a few flat
// "<courseSlug>/<page>" entries (e.g. capstone index docs) — the topic is
// always the second-to-last segment when there is one.
function topicSlug(docId) {
  const parts = docId.split('/');
  return parts.length > 2 ? parts[1] : parts[0];
}

function humanize(slug) {
  return slug
    .split('-')
    .map((word) => (ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

// The last docId segment is either an exact tag (overview/build-it/
// avoid-mistakes/review) or a topic-prefixed one
// (what-llm-and-api-are-overview, ...-practice, ...-general-practice).
// Classify by suffix so both styles resolve to the same tag.
function pageType(lastSegment) {
  if (lastSegment === 'index') return 'overview';
  if (/(^|-)general-practice$/.test(lastSegment)) return 'general-practice';
  if (/(^|-)overview$/.test(lastSegment)) return 'overview';
  if (/(^|-)practice$/.test(lastSegment)) return 'practice';
  return lastSegment;
}

function pageLabel(type) {
  const labels = {
    overview: 'Overview',
    'build-it': 'Build It',
    'avoid-mistakes': 'Avoid Mistakes',
    review: 'Review',
    practice: 'Practice',
    'general-practice': 'General Practice',
  };
  return labels[type] || humanize(type);
}

export default function CourseCurriculum() {
  const location = useLocation();
  const data = usePluginData('course-sections');
  const courseSectionMap = data?.courseSectionMap ?? {};
  const courseSectionLabels = data?.courseSectionLabels ?? {};
  const { role, supabase, companyName } = useAuth();
  const [accessRows, setAccessRows] = useState([]);
  const [companyAllowedSlugs, setCompanyAllowedSlugs] = useState(new Set());

  useEffect(() => {
    fetchCourseAccessRows(supabase).then(setAccessRows);
  }, [supabase]);

  useEffect(() => {
    if (role !== 'company_employees' || !companyName) return;
    fetchCompanyCourseAccessRows(supabase, companyName).then(setCompanyAllowedSlugs);
  }, [supabase, role, companyName]);

  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length < 2 || parts[0] !== 'docs') return null;
  const courseSlug = parts[1];

  const courseMap = courseSectionMap[courseSlug];
  if (!courseMap) return null;
  const sectionLabels = courseSectionLabels[courseSlug] ?? [];

  const sectionIndices = [...new Set(Object.values(courseMap))].sort((a, b) => a - b);

  const sections = sectionIndices.map((idx) => {
    const docIds = Object.entries(courseMap)
      .filter(([, sectionIdx]) => sectionIdx === idx)
      .map(([docId]) => docId);
    return { index: idx, docIds };
  });

  const accessRow = accessRows.find((r) => r.course_slug === courseSlug);
  const isFree = hasCourseAccess(role, accessRow?.allowed_roles ?? [], { slug: courseSlug, companyAllowedSlugs });

  return (
    <div className={styles.courseCurriculum}>
      <h2>Course Details</h2>
      {sections.map((section) => {
        const topics = {};
        const topicOrder = [];
        for (const docId of section.docIds) {
          const topic = topicSlug(docId);
          if (!topics[topic]) {
            topics[topic] = [];
            topicOrder.push(topic);
          }
          topics[topic].push(docId);
        }

        return (
          <div key={section.index} className={styles.ccSection}>
            <h3>{sectionLabels[section.index] || `Section ${section.index + 1}`}</h3>
            <div className={styles.ccLessons}>
              {topicOrder.map((topic) => {
                const pages = topics[topic];
                const overviewPage = pages.find((p) => pageType(p.split('/').pop()) === 'overview');
                const linkTarget = `/docs/${overviewPage || pages[0]}`;
                const lessonName = humanize(topic);

                return (
                  <div key={topic} className={styles.ccLesson}>
                    {isFree ? (
                      <Link to={linkTarget} className={styles.ccLessonLink}>
                        <span className={styles.ccLessonName}>{lessonName}</span>
                      </Link>
                    ) : (
                      <span className={`${styles.ccLessonName} ${styles.ccLessonLocked}`}>
                        {lessonName}
                      </span>
                    )}
                    <div className={styles.ccPages}>
                      {pages.map((page) => {
                        const type = pageType(page.split('/').pop());
                        const pagePath = `/docs/${page}`;
                        const label = pageLabel(type);
                        return (
                          <span key={page} className={styles.ccPageTag}>
                            {isFree ? (
                              <Link to={pagePath} className={styles.ccPageLink}>
                                {label}
                              </Link>
                            ) : (
                              <span className={styles.ccPageLocked}>{label}</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import { usePluginData } from '@docusaurus/useGlobalData';

/**
 * Fetch runtime access control config, cached after first load.
 */
let cachedConfig = null;
let configPromise = null;

function fetchConfig() {
  if (cachedConfig) return Promise.resolve(cachedConfig);
  if (configPromise) return configPromise;
  configPromise = fetch('/access-control.json')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch access-control.json');
      return res.json();
    })
    .then((data) => {
      cachedConfig = data;
      return data;
    })
    .catch(() => {
      cachedConfig = { freeCourses: [], freeSections: 3 };
      return cachedConfig;
    });
  return configPromise;
}

function getLessonSlugs(items, courseSlug) {
  const slugs = [];
  for (const item of items) {
    if (typeof item === 'string') {
      slugs.push(item.replace(`${courseSlug}/`, ''));
    } else if (item.type === 'category' && Array.isArray(item.items)) {
      slugs.push(...getLessonSlugs(item.items, courseSlug));
    }
  }
  return slugs;
}

function topicName(docId) {
  const parts = docId.split('/');
  return parts[0];
}

function pageType(docId) {
  const parts = docId.split('/');
  return parts.length > 1 ? parts[parts.length - 1] : 'overview';
}

function pageLabel(type) {
  const labels = {
    overview: 'Overview',
    'build-it': 'Build It',
    'avoid-mistakes': 'Avoid Mistakes',
    review: 'Review',
  };
  return labels[type] || type;
}

export default function CourseCurriculum() {
  const location = useLocation();
  const data = usePluginData('access-control');
  const courseSectionMap = data?.courseSectionMap ?? {};
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetchConfig().then(setConfig);
  }, []);

  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length < 2 || parts[0] !== 'docs') return null;
  const courseSlug = parts[1];

  const courseMap = courseSectionMap[courseSlug];
  if (!courseMap) return null;

  const sectionIndices = [...new Set(Object.values(courseMap))].sort((a, b) => a - b);

  const sections = sectionIndices.map((idx) => {
    const docIds = Object.entries(courseMap)
      .filter(([, sectionIdx]) => sectionIdx === idx)
      .map(([docId]) => docId);
    return { index: idx, docIds };
  });

  const freeCourses = config?.freeCourses ?? [];
  const isFree = freeCourses.includes(courseSlug);

  return (
    <div className="course-curriculum">
      <h2>Course Details</h2>
      {sections.map((section) => {
        const topics = {};
        for (const docId of section.docIds) {
          const topic = topicName(docId);
          if (!topics[topic]) topics[topic] = [];
          topics[topic].push(docId);
        }

        const topicNames = Object.keys(topics);

        return (
          <div key={section.index} className="cc-section">
            <h3>Section {section.index + 1}</h3>
            <div className="cc-lessons">
              {topicNames.map((topic) => {
                const pages = topics[topic];
                const overviewPage = pages.find((p) => p.endsWith('/overview'));
                const linkTarget = overviewPage
                  ? `/docs/${courseSlug}/${topic}/overview`
                  : `/docs/${courseSlug}/${topic}/${pages[0]}`;

                return (
                  <div key={topic} className="cc-lesson">
                    {isFree ? (
                      <Link to={linkTarget} className="cc-lesson-link">
                        <span className="cc-lesson-name">{topic}</span>
                      </Link>
                    ) : (
                      <span className="cc-lesson-name cc-lesson-locked">
                        {topic}
                      </span>
                    )}
                    <div className="cc-pages">
                      {pages.map((page) => {
                        const type = pageType(page);
                        const pagePath = `/docs/${courseSlug}/${page}`;
                        const label = pageLabel(type);
                        return (
                          <span key={page} className="cc-page-tag">
                            {isFree ? (
                              <Link to={pagePath} className="cc-page-link">
                                {label}
                              </Link>
                            ) : (
                              <span className="cc-page-locked">{label}</span>
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
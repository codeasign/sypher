import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import { usePluginData } from '@docusaurus/useGlobalData';
import { useAuth } from '@site/src/contexts/AuthContext';
import { fetchCourseAccessRows, hasCourseAccess } from '@site/src/data/courseAccess';
import { fetchCompanyCourseAccessRows } from '@site/src/data/companyAccess';

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
  const data = usePluginData('course-sections');
  const courseSectionMap = data?.courseSectionMap ?? {};
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
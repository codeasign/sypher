import React, { useEffect, useState } from 'react';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { withCourseAccess } from '@site/src/data/homepageCourses';
import { fetchCourseAccessRows } from '@site/src/data/courseAccess';
import { fetchCompanyCourseAccessRows } from '@site/src/data/companyAccess';
import { CourseGrid } from '@site/src/components/CourseCard';
import { useAuth } from '@site/src/contexts/AuthContext';
import { useBookmarks } from '@site/src/hooks/useBookmarks';
import styles from './styles.module.css';

export default function HomepageFeatures() {
  const { siteConfig } = useDocusaurusContext();
  const { showDurationOnLanding } = siteConfig.customFields;
  const { user, supabase, role, companyName } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [accessRows, setAccessRows] = useState([]);
  const [companyAllowedSlugs, setCompanyAllowedSlugs] = useState(new Set());

  useEffect(() => {
    fetchCourseAccessRows(supabase).then(setAccessRows);
  }, [supabase]);

  useEffect(() => {
    if (role !== 'company_employees' || !companyName) return;
    fetchCompanyCourseAccessRows(supabase, companyName).then(setCompanyAllowedSlugs);
  }, [supabase, role, companyName]);

  const withSlugs = withCourseAccess(role, accessRows, companyAllowedSlugs);

  const freeCoursesList = withSlugs.filter((c) => c.isFree);
  const premiumCoursesList = withSlugs.filter((c) => !c.isFree);

  return (
    <section className={styles.features}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            Explore Our Courses
          </Heading>
          <p className={styles.sectionSubtitle}>
            From Python fundamentals to production AI systems — every topic is hands-on, text-first, and built for real engineering growth.
          </p>
        </div>

        {freeCoursesList.length > 0 && (
          <>
            <div className={styles.subsectionHeader}>
              <Heading as="h3" className={styles.subsectionTitle}>Free Courses</Heading>
              <span className={styles.subsectionCount}>{freeCoursesList.length} courses</span>
            </div>
            <CourseGrid
              courses={freeCoursesList}
              showDuration={showDurationOnLanding}
              isBookmarked={user ? isBookmarked : undefined}
              onToggleBookmark={user ? toggleBookmark : undefined}
            />
          </>
        )}

        {premiumCoursesList.length > 0 && (
          <>
            <div className={styles.subsectionHeader}>
              <Heading as="h3" className={styles.subsectionTitle}>Premium Courses</Heading>
              <span className={styles.subsectionCount}>{premiumCoursesList.length} courses</span>
            </div>
            <CourseGrid
              courses={premiumCoursesList}
              showDuration={showDurationOnLanding}
              isBookmarked={user ? isBookmarked : undefined}
              onToggleBookmark={user ? toggleBookmark : undefined}
            />
          </>
        )}
      </div>
    </section>
  );
}

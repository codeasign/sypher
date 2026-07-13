import React, { useEffect, useState } from 'react';
import DashboardLayout from '@site/src/components/DashboardLayout';
import { useAuth } from '@site/src/contexts/AuthContext';
import { fetchCourseAccessRows } from '@site/src/data/courseAccess';
import { fetchCompanyCourseAccessRows } from '@site/src/data/companyAccess';
import { withCourseAccess } from '@site/src/data/homepageCourses';
import DashboardCourseListing from '@site/src/components/DashboardCourseListing';
import styles from './dashboard.module.css';

function DashboardContent(): JSX.Element {
  const { supabase, role, companyName } = useAuth();
  const [accessRows, setAccessRows] = useState<{ course_slug: string; allowed_roles: string[] }[]>([]);
  const [companyAllowedSlugs, setCompanyAllowedSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCourseAccessRows(supabase).then(setAccessRows);
  }, [supabase]);

  useEffect(() => {
    if (role !== 'company_employees' || !companyName) return;
    fetchCompanyCourseAccessRows(supabase, companyName).then(setCompanyAllowedSlugs);
  }, [supabase, role, companyName]);

  const courses = withCourseAccess(role, accessRows, companyAllowedSlugs);
  const freeCoursesList = courses.filter((c) => c.isFree);
  const premiumCoursesList = courses.filter((c) => !c.isFree);

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.heading}>Dashboard</h1>
      </div>

      {freeCoursesList.length > 0 && (
        <>
          <div className={styles.subsectionHeader}>
            <h2 className={styles.coursesHeading}>Free Courses</h2>
          </div>
          <DashboardCourseListing
            courses={freeCoursesList}
          />
        </>
      )}

      {premiumCoursesList.length > 0 && (
        <>
          <div className={styles.subsectionHeader}>
            <h2 className={styles.coursesHeading}>Premium Courses</h2>
          </div>
          <DashboardCourseListing
            courses={premiumCoursesList}
          />
        </>
      )}
    </>
  );
}

export default function DashboardPage(): JSX.Element {
  return (
    <DashboardLayout title="Dashboard" description="Your Sypher dashboard">
      <DashboardContent />
    </DashboardLayout>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCourseAccessRows, hasCourseAccess } from '@/data/courseAccess';
import { fetchCompanyCourseAccessRows } from '@/data/companyAccess';
import { withCourseAccess } from '@sypher/course-catalog/src/homepageCourses';
import DashboardCourseListing from '@/components/DashboardCourseListing';
import styles from './dashboard.module.css';

function DashboardContent(): React.JSX.Element {
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

  const courses = withCourseAccess(hasCourseAccess, role, accessRows, companyAllowedSlugs);
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

export default function DashboardPage(): React.JSX.Element {
  return (
    <DashboardLayout title="Dashboard" description="Your Sypher dashboard">
      <DashboardContent />
    </DashboardLayout>
  );
}

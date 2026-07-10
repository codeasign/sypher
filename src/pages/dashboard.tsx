import React, { useEffect, useState } from 'react';
import DashboardLayout from '@site/src/components/DashboardLayout';
import { useAuth } from '@site/src/contexts/AuthContext';
import { fetchAccessControlConfig, withCourseAccess } from '@site/src/data/homepageCourses';
import DashboardCourseListing from '@site/src/components/DashboardCourseListing';
import styles from './dashboard.module.css';

function DashboardContent(): JSX.Element {
  const { user } = useAuth();
  const [freeCourses, setFreeCourses] = useState<string[]>([]);

  useEffect(() => {
    fetchAccessControlConfig().then((cfg) => setFreeCourses(cfg.freeCourses ?? []));
  }, []);

  const courses = withCourseAccess(freeCourses);
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
            <span className={styles.subsectionCount}>{freeCoursesList.length} courses</span>
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
            <span className={styles.subsectionCount}>{premiumCoursesList.length} courses</span>
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

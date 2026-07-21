import DashboardCourseListing from '@/components/DashboardCourseListing';
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

interface HomeCourseCatalogProps {
  freeCourses: CourseData[];
  premiumCourses: CourseData[];
}

export default function HomeCourseCatalog({ freeCourses, premiumCourses }: HomeCourseCatalogProps) {
  return (
    <section className={styles.features}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Explore Our Courses</h2>
          <p className={styles.sectionSubtitle}>
            From Python fundamentals to production AI systems — every topic is hands-on, text-first, and built for real engineering growth.
          </p>
        </div>

        {freeCourses.length > 0 && (
          <>
            <div className={styles.subsectionHeader}>
              <h3 className={styles.subsectionTitle}>Free Courses</h3>
              <span className={styles.subsectionCount}>{freeCourses.length} courses</span>
            </div>
            <DashboardCourseListing courses={freeCourses} trackingContext="home" />
          </>
        )}

        {premiumCourses.length > 0 && (
          <>
            <div className={styles.subsectionHeader}>
              <h3 className={styles.subsectionTitle}>Premium Courses</h3>
              <span className={styles.subsectionCount}>{premiumCourses.length} courses</span>
            </div>
            <DashboardCourseListing courses={premiumCourses} trackingContext="home" />
          </>
        )}
      </div>
    </section>
  );
}

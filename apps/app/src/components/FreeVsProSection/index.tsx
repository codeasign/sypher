import Link from 'next/link';
import { getDocsOrigin } from '@sypher/auth-core/src/urls';
import courses from '@sypher/course-catalog/src/courses';
import styles from './styles.module.css';

const DOCS_ORIGIN = getDocsOrigin();

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ResumeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

function InterviewIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

const SHOW_RESUME_REVIEW = process.env.NAVBAR_SHOW_RESUME_REVIEW !== 'false';
const SHOW_MOCK_INTERVIEW = process.env.NAVBAR_SHOW_MOCK_INTERVIEW !== 'false';

// Real facts only, sourced from the access-control code (courseAccess.js) --
// no price shown (none is safely knowable here), no free trial of Pro
// (there isn't one), no progress tracking (doesn't exist).
const rows: Array<{ feature: string; free: boolean; pro: boolean; shown: boolean }> = [
  { feature: 'Free courses, no time limit', free: true, pro: true, shown: true },
  { feature: 'Bookmark courses to come back to later', free: true, pro: true, shown: true },
  { feature: `Full course catalog — all ${courses.length} courses`, free: false, pro: true, shown: true },
  { feature: 'Resume Review — included every year', free: false, pro: true, shown: SHOW_RESUME_REVIEW },
  { feature: 'Mock Interview — included every year', free: false, pro: true, shown: SHOW_MOCK_INTERVIEW },
  {
    feature: 'Buy additional Resume Review / Mock Interview credits anytime',
    free: false,
    pro: true,
    shown: SHOW_RESUME_REVIEW || SHOW_MOCK_INTERVIEW,
  },
].filter((row) => row.shown);

export default function FreeVsProSection() {
  return (
    <section className={styles.section} id="free-vs-pro">
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Free vs Pro</h2>
          <p className={styles.sectionSubtitle}>
            Every account starts free, forever. Upgrade to Pro anytime from your dashboard for the
            full catalog{SHOW_RESUME_REVIEW || SHOW_MOCK_INTERVIEW ? ' and career services' : ''}.
          </p>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.featureHead} scope="col">
                  Feature
                </th>
                <th className={styles.planHead} scope="col">
                  Free
                </th>
                <th className={`${styles.planHead} ${styles.planHeadPro}`} scope="col">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature}>
                  <th className={styles.featureCell} scope="row">
                    {row.feature}
                  </th>
                  <td className={styles.planCell}>
                    {row.free ? (
                      <span className={styles.iconIncluded}>
                        <CheckIcon />
                      </span>
                    ) : (
                      <span className={styles.iconExcluded}>
                        <XIcon />
                      </span>
                    )}
                  </td>
                  <td className={`${styles.planCell} ${styles.planCellPro}`}>
                    {row.pro ? (
                      <span className={styles.iconIncluded}>
                        <CheckIcon />
                      </span>
                    ) : (
                      <span className={styles.iconExcluded}>
                        <XIcon />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td />
                <td className={styles.planCell}>
                  <Link href="/signup" className={styles.tableBtnSecondary}>
                    Sign Up Free
                  </Link>
                </td>
                <td className={`${styles.planCell} ${styles.planCellPro}`}>
                  <Link href="/signup" className={styles.tableBtnPrimary}>
                    Get Started
                  </Link>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {(SHOW_RESUME_REVIEW || SHOW_MOCK_INTERVIEW) && (
          <div className={styles.servicesCallout}>
            {SHOW_RESUME_REVIEW && (
              <a href={`${DOCS_ORIGIN}/resume-review`} className={styles.calloutCard}>
                <div className={styles.calloutIcon}>
                  <ResumeIcon />
                </div>
                <div>
                  <h3 className={styles.calloutTitle}>Resume Review</h3>
                  <p className={styles.calloutDesc}>
                    Detailed, actionable feedback on your resume — included every year with Pro.
                  </p>
                </div>
                <span className={styles.calloutLink}>
                  Learn more <span aria-hidden="true">→</span>
                </span>
              </a>
            )}
            {SHOW_MOCK_INTERVIEW && (
              <a href={`${DOCS_ORIGIN}/mock-interview`} className={styles.calloutCard}>
                <div className={styles.calloutIcon}>
                  <InterviewIcon />
                </div>
                <div>
                  <h3 className={styles.calloutTitle}>Mock Interview</h3>
                  <p className={styles.calloutDesc}>
                    Practice real technical interviews with experienced interviewers — included every
                    year with Pro.
                  </p>
                </div>
                <span className={styles.calloutLink}>
                  Learn more <span aria-hidden="true">→</span>
                </span>
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

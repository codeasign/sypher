import type { SVGProps } from 'react';
import { getDocsOrigin } from '@sypher/auth-core/src/urls';
import styles from './styles.module.css';

const DOCS_ORIGIN = getDocsOrigin();

function BriefcaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.5h18" />
    </svg>
  );
}

function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c.7-3 2.9-4.8 5.5-4.8s4.8 1.8 5.5 4.8" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.5 14.5c2.1.3 3.7 1.9 4.3 4.5" />
    </svg>
  );
}

const links = [
  {
    title: 'Hiring?',
    description: 'Get a curated shortlist of engineers with verified, hands-on skills.',
    cta: 'Hire with Us',
    href: `${DOCS_ORIGIN}/hire-with-us`,
    icon: <BriefcaseIcon />,
  },
  {
    title: 'Running a team?',
    description: 'License the full catalog for your company and restrict access to exactly what your team needs.',
    cta: 'Team Access',
    href: `${DOCS_ORIGIN}/team-access`,
    icon: <UsersIcon />,
  },
];

// Slim B2B band for a different audience (hiring managers, company/team
// admins) than the rest of the homepage's individual-learner funnel --
// placed just above the footer so it doesn't interrupt that flow.
export default function ForBusinessSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <span className={styles.eyebrow}>For Companies &amp; Teams</span>
        <div className={styles.grid}>
          {links.map((link) => (
            <a key={link.title} href={link.href} className={styles.card}>
              <span className={styles.cardIcon}>{link.icon}</span>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{link.title}</h3>
                <p className={styles.cardDesc}>{link.description}</p>
              </div>
              <span className={styles.cardCta}>
                {link.cta} <span aria-hidden="true">→</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

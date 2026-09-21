import { Briefcase, Users, type LucideProps } from 'lucide-react';
import { getDocsOrigin } from '@sypher/auth-core/src/urls';
import styles from './styles.module.css';

const DOCS_ORIGIN = getDocsOrigin();

function BriefcaseIcon(props: LucideProps) {
  return <Briefcase size={24} strokeWidth={1.8} aria-hidden="true" {...props} />;
}

function UsersIcon(props: LucideProps) {
  return <Users size={24} strokeWidth={1.8} aria-hidden="true" {...props} />;
}

const links = [
  {
    title: 'Hiring?',
    description: 'Get a curated shortlist of engineers with verified, hands-on skills.',
    cta: 'Hire with Us',
    href: `${DOCS_ORIGIN}/hire-with-us`,
    icon: <BriefcaseIcon />,
    shown: process.env.NAVBAR_SHOW_HIRE_WITH_US !== 'false',
  },
  {
    title: 'Running a team?',
    description: 'License the full catalog for your company and restrict access to exactly what your team needs.',
    cta: 'Team Access',
    href: `${DOCS_ORIGIN}/team-access`,
    icon: <UsersIcon />,
    shown: process.env.NAVBAR_SHOW_TEAM_ACCESS !== 'false',
  },
].filter((link) => link.shown);

// Slim B2B band for a different audience (hiring managers, company/team
// admins) than the rest of the homepage's individual-learner funnel --
// placed just above the footer so it doesn't interrupt that flow.
export default function ForBusinessSection() {
  if (links.length === 0) return null;

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

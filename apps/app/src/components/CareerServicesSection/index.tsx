import type { ReactNode } from 'react';
import { getDocsOrigin } from '@sypher/auth-core/src/urls';
import styles from './styles.module.css';

const services = [
  {
    title: 'Resume Review',
    description:
      "Get detailed, actionable feedback on your resume from people who've reviewed thousands of them — not a generic template checker.",
    href: `${getDocsOrigin()}/resume-review`,
    icon: 'resume',
  },
  {
    title: 'Mock Interview',
    description:
      'Practice real technical interviews with experienced interviewers and walk away with a written report on what to fix before the real thing.',
    href: `${getDocsOrigin()}/mock-interview`,
    icon: 'interview',
  },
];

function ServiceIcon({ name }: { name: string }) {
  const icons: Record<string, ReactNode> = {
    resume: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h6" />
      </>
    ),
    interview: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
  };
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

export default function CareerServicesSection() {
  return (
    <section className={styles.services}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Included with Pro</span>
          <h2 className={styles.sectionTitle}>Career Services That Actually Help You Get Hired</h2>
          <p className={styles.sectionSubtitle}>
            Learning the material is half the job. Pro members get real, human feedback on the
            other half — included every year, with the option to buy more anytime.
          </p>
        </div>
        <div className={styles.servicesGrid}>
          {services.map((service) => (
            <a key={service.title} href={service.href} className={styles.serviceCard}>
              <div className={styles.serviceIcon}>
                <ServiceIcon name={service.icon} />
              </div>
              <h3 className={styles.serviceTitle}>{service.title}</h3>
              <p className={styles.serviceDesc}>{service.description}</p>
              <span className={styles.serviceLink}>
                Learn more <span aria-hidden="true">→</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

import { FileText, Monitor, type LucideIcon } from 'lucide-react';
import { getDocsOrigin } from '@sypher/auth-core/src/urls';
import styles from './styles.module.css';

const services = [
  {
    title: 'Resume Review',
    description:
      "Get detailed, actionable feedback on your resume from people who've reviewed thousands of them — not a generic template checker.",
    href: `${getDocsOrigin()}/resume-review`,
    icon: 'resume',
    shown: process.env.NAVBAR_SHOW_RESUME_REVIEW !== 'false',
  },
  {
    title: 'Mock Interview',
    description:
      'Practice real technical interviews with experienced interviewers and walk away with a written report on what to fix before the real thing.',
    href: `${getDocsOrigin()}/mock-interview`,
    icon: 'interview',
    shown: process.env.NAVBAR_SHOW_MOCK_INTERVIEW !== 'false',
  },
].filter((service) => service.shown);

const serviceIcons: Record<string, LucideIcon> = {
  resume: FileText,
  interview: Monitor,
};

function ServiceIcon({ name }: { name: string }) {
  const Glyph = serviceIcons[name];
  return Glyph ? <Glyph size={26} strokeWidth={1.6} aria-hidden="true" /> : null;
}

export default function CareerServicesSection() {
  if (services.length === 0) return null;

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

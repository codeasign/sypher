import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import TeamAccessContactForm from '@site/src/components/TeamAccessContactForm';
import styles from './corporate-training.module.css';

const heroHighlights = [
  {
    title: 'Restrict by Course',
    description: 'Choose exactly which courses your team can access — nothing more, nothing less.',
  },
  {
    title: 'Bulk Team Onboarding',
    description: 'Invite your whole team in minutes with a single CSV upload.',
  },
  {
    title: 'One Company Profile',
    description: 'Centralized billing and access management under a single company account.',
  },
];

const whyItems = [
  { title: 'Full Catalog Access', description: 'License our entire library — Python, AI engineering, system design, algorithms, and more — under one account.', icon: 'catalog' },
  { title: 'Restrict by Course', description: 'Control exactly which courses each employee or team can see, so access always matches what they need.', icon: 'restrict' },
  { title: 'Bulk Team Onboarding', description: 'Invite your entire team at once via CSV upload — no one-by-one sign-ups to manage.', icon: 'bulk' },
  { title: 'Centralized Company Profile', description: 'Every team member is grouped under one company account, with access managed in one place.', icon: 'company' },
  { title: 'Flexible for Any Team Size', description: "Whether you're onboarding 5 people or 500, access scales with your team.", icon: 'flexible' },
  { title: 'No Individual Sign-Ups', description: 'We handle team invites directly, so your people never need to find and register themselves.', icon: 'invite' },
];

const audiences = [
  'Startups',
  'Engineering Teams',
  'Bootcamps',
  'Universities & Institutions',
  'Corporate L&D Teams',
  'Coding Academies',
];

const steps = [
  { step: '1', title: 'Tell Us About Your Team', description: 'Share your team size and which courses or tracks you want your people to have access to.' },
  { step: '2', title: 'We Set Up Your Company Profile', description: 'We configure your company account and scope course access to exactly what you need.' },
  { step: '3', title: 'Invite Your Team', description: 'Bulk-invite your whole team via CSV, or add people individually — we handle the rollout.' },
  { step: '4', title: 'Your Team Starts Learning', description: 'Everyone gets access on day one, and you can adjust course access anytime as needs change.' },
];

const faqs = [
  {
    question: 'Can we restrict which courses our team sees?',
    answer: 'Yes. You choose exactly which courses are included in your team\'s access — nothing your employees see is left to chance.',
  },
  {
    question: 'How do we invite our team?',
    answer: 'We support bulk invitations via CSV upload for fast rollout, or individual invites if you prefer to onboard people gradually.',
  },
  {
    question: 'Is pricing per seat or a flat rate?',
    answer: "It depends on your team size and the scope of access you need — reach out and we'll tailor a plan for you.",
  },
  {
    question: 'Can we change course access later?',
    answer: 'Yes, course access can be updated at any time as your team\'s needs change — nothing is locked in permanently.',
  },
  {
    question: 'Do you support institutions like bootcamps or universities?',
    answer: 'Yes. Bootcamps, universities, and coding academies can license course access for cohorts the same way companies do for teams.',
  },
  {
    question: 'Do employees need to sign up individually?',
    answer: 'No — we handle team invitations directly, so your employees are added under your company account without a separate sign-up flow.',
  },
];

const accentClasses = ['accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6'];

function accentFor(index) {
  return accentClasses[index % accentClasses.length];
}

function WhyIcon({ name }) {
  const icons = {
    catalog: <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></>,
    restrict: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 1 1 8 0v4" /></>,
    bulk: <><circle cx="9" cy="8" r="3" /><path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" /><circle cx="17.5" cy="8.5" r="2.5" /><path d="M15.5 14.2c2.6.4 4.5 2.4 4.5 5.3" /></>,
    company: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01M9 12h.01M9 16h.01M15 8h.01M15 12h.01M15 16h.01" /></>,
    flexible: <path d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5M14 4h4v4M10 20H6v-4" />,
    invite: <><path d="M22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /><path d="M2 7l10 6 4-2.4" /><path d="M18 3v6M15 6h6" /></>,
  };
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function HeroSection() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroBg} />
      <div className={styles.container}>
        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>
            <Heading as="h1" className={styles.heroTitle}>
              Give Your Whole Team Access — On Your Terms
            </Heading>
            <p className={styles.heroSubtitle}>
              License our entire course catalog for your company, or restrict access to exactly
              the courses your team needs.
            </p>
            <p className={styles.heroSubtitle}>
              One company profile, centralized management, and full control over what your team
              can see — built for startups, engineering teams, and institutions alike.
            </p>
            <div className={styles.heroButtons}>
              <Link className={styles.secondaryBtn} to="#contact">Request Team Access</Link>
            </div>
          </div>
          <div className={styles.heroVisual}>
            {heroHighlights.map((item) => (
              <div key={item.title} className={styles.heroTile}>
                <span className={styles.heroTileTitle}>{item.title}</span>
                <p className={styles.heroTileDesc}>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function AudienceSection() {
  return (
    <section className={styles.trustBand}>
      <div className={styles.container}>
        <div className={styles.trustColumn}>
          <span className={styles.trustLabel}>Who Is This For</span>
          <div className={styles.trustGrid}>
            {audiences.map((label, index) => (
              <span
                key={label}
                className={`${styles.audienceBadge} ${styles[accentFor(index)]}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function WhySection() {
  return (
    <section className={styles.why}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>Why Teams Choose Sypher</Heading>
        </div>
        <div className={styles.whyBento}>
          {whyItems.map((item, index) => (
            <div
              key={item.title}
              className={`${index < 2 ? styles.whyTileLarge : styles.whyTileSmall} ${styles[accentFor(index)]}`}
            >
              <div className={styles.whyIcon}>
                <WhyIcon name={item.icon} />
              </div>
              <span className={styles.whyLabel}>{item.title}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section className={styles.process}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>How Team Access Works</Heading>
        </div>
        <div className={styles.timeline}>
          <div className={styles.timelineLine} aria-hidden="true" />
          {steps.map((item) => (
            <div key={item.step} className={styles.timelineStep}>
              <div className={styles.timelineCircle}>{item.step}</div>
              <Heading as="h3" className={styles.timelineTitle}>{item.title}</Heading>
              <p className={styles.timelineDesc}>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqContactSection() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className={styles.faqContact}>
      <div className={styles.container}>
        <div className={styles.faqContactGrid}>
          <div className={styles.faqColumn}>
            <Heading as="h2" id="contact" className={styles.sectionTitle}>Frequently Asked Questions</Heading>
            <div className={styles.faqList}>
              {faqs.map((item, index) => {
                const isOpen = openIndex === index;
                return (
                  <div key={item.question} className={styles.faqItem}>
                    <button
                      type="button"
                      className={styles.faqQuestion}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${index}`}
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                    >
                      <span>{item.question}</span>
                      <span className={styles.faqIcon}>{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && (
                      <p id={`faq-panel-${index}`} className={styles.faqAnswer}>
                        {item.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className={styles.formColumn}>
            <div className={styles.contactFormWrapper}>
              <Heading as="h2" className={styles.contactFormTitle}>Request Team Access</Heading>
              <p className={styles.contactFormSubtitle}>
                Tell us about your team, and we'll set up course access scoped to exactly what
                you need.
              </p>
              <TeamAccessContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function TeamAccess() {
  return (
    <Layout
      title="Team Access"
      description="Give your company, startup, or institution access to our full course catalog — restrict access to exactly the courses your team needs, with bulk onboarding and centralized billing."
    >
      <HeroSection />
      <AudienceSection />
      <WhySection />
      <ProcessSection />
      <FaqContactSection />
    </Layout>
  );
}

import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import TrainingContactForm from '@site/src/components/TrainingContactForm';
import styles from './corporate-training.module.css';

const solutions = [
  {
    title: 'On-Premise Training',
    description: 'Instructor-led workshops at your office, with hands-on exercises.',
  },
  {
    title: 'Live Online Training',
    description: 'Interactive virtual sessions with live coding and practical exercises.',
  },
  {
    title: 'Custom Learning Programs',
    description: "Learning paths tailored to your team's goals and experience level.",
  },
];

const whyItems = [
  { title: 'Hands-on Learning', icon: 'hands' },
  { title: 'Customized Curriculum', icon: 'curriculum' },
  { title: 'Experienced Instructors', icon: 'instructor' },
  { title: 'Flexible Delivery', icon: 'flexible' },
  { title: 'Real-World Projects', icon: 'projects' },
  { title: 'Post-Training Support', icon: 'support' },
];

const audiences = [
  'Software Engineers',
  'QA Engineers',
  'SDETs',
  'Engineering Teams',
  'New Hire Cohorts',
  'Team Leads & Managers',
];

const formats = [
  'Half-Day Workshops',
  'Full-Day Workshops',
  'Multi-Day Bootcamps',
  'Intensive Learning Programs',
  'Cohort-Based Training',
  'Long-Term Upskilling Programs',
];

const steps = [
  { step: '1', title: 'Understand Your Goals', description: "We start by learning about your team's context, skill gaps, and business objectives." },
  { step: '2', title: 'Design a Tailored Program', description: 'We shape a curriculum and delivery format around what your team actually needs.' },
  { step: '3', title: 'Deliver Interactive Training', description: 'Instructors lead hands-on sessions with real exercises and collaborative practice.' },
  { step: '4', title: 'Measure Outcomes & Gather Feedback', description: 'We review outcomes together and refine future sessions based on feedback.' },
];

const faqs = [
  {
    question: 'Can the curriculum be customized?',
    answer: "Yes. Every program is built around your team's goals, experience level, and the outcomes you care about most.",
  },
  {
    question: 'Do you provide on-site training?',
    answer: 'Yes, we deliver instructor-led training at your office, in addition to online and hybrid formats.',
  },
  {
    question: 'Can sessions be delivered online?',
    answer: 'Yes. Our live online sessions include the same hands-on exercises and instructor interaction as in-person training.',
  },
  {
    question: 'What is the ideal batch size?',
    answer: 'We tailor group size to your goals — from focused small-group sessions to full cohort-based programs.',
  },
  {
    question: 'Can training be scheduled around working hours?',
    answer: "Yes, we work with your team's schedule and time zones to minimize disruption to daily work.",
  },
  {
    question: 'Do participants receive learning materials?',
    answer: 'Yes, participants receive supporting materials to reinforce learning during and after each session.',
  },
  {
    question: 'How do you measure learning outcomes?',
    answer: 'We define success criteria upfront with your team and gather feedback throughout to track progress against them.',
  },
];

const accentClasses = ['accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6'];

function accentFor(index) {
  return accentClasses[index % accentClasses.length];
}

function WhyIcon({ name }) {
  const icons = {
    hands: <path d="M8 12V6a2 2 0 1 1 4 0v5M12 11V4a2 2 0 1 1 4 0v7M16 10V6a2 2 0 1 1 4 0v7c0 4-3 7-7 7h-2c-3 0-4-1-6-4l-2-3a1.7 1.7 0 0 1 3-1.5L8 13" />,
    curriculum: <path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2V5ZM20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2V5Z" />,
    instructor: <><circle cx="12" cy="7" r="3.2" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></>,
    flexible: <path d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5M14 4h4v4M10 20H6v-4" />,
    projects: <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></>,
    support: <path d="M12 21c-4.4-3-8-6.3-8-10.5A5 5 0 0 1 12 7a5 5 0 0 1 8 3.5c0 4.2-3.6 7.5-8 10.5Z" />,
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
              Corporate Training for Modern Engineering Teams
            </Heading>
            <p className={styles.heroSubtitle}>
              Practical, instructor-led training tailored to your team's goals — on-site,
              online, or fully customized.
            </p>
            <p className={styles.heroSubtitle}>
              Whether it's onboarding, upskilling, or a long-term program, we'll design it
              around your goals.
            </p>
            <div className={styles.heroButtons}>
              <Link className={styles.secondaryBtn} to="#contact">Schedule a Consultation</Link>
            </div>
          </div>
          <div className={styles.heroVisual}>
            {solutions.map((item) => (
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

function TrustSection() {
  return (
    <section className={styles.trustBand}>
      <div className={styles.container}>
        <div className={styles.trustColumns}>
          <div className={styles.trustColumn}>
            <span className={styles.trustLabel}>Who We Train</span>
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
          <div className={styles.trustColumn}>
            <span className={styles.trustLabel}>Training Formats</span>
            <div className={styles.formatTags}>
              {formats.map((label, index) => (
                <span
                  key={label}
                  className={`${styles.formatTag} ${styles[accentFor(index)]}`}
                >
                  {label}
                </span>
              ))}
            </div>
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
          <Heading as="h2" className={styles.sectionTitle}>Why Organizations Choose Sypher</Heading>
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
          <Heading as="h2" className={styles.sectionTitle}>How We Work</Heading>
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
    <section id="contact" className={styles.faqContact}>
      <div className={styles.container}>
        <div className={styles.faqContactGrid}>
          <div className={styles.faqColumn}>
            <Heading as="h2" className={styles.sectionTitle}>Frequently Asked Questions</Heading>
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
              <Heading as="h2" className={styles.contactFormTitle}>Request a Proposal</Heading>
              <p className={styles.contactFormSubtitle}>
                Tell us about your team, and we'll put together a tailored proposal.
              </p>
              <TrainingContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClosingBanner() {
  return (
    <section className={styles.closingBanner}>
      <div className={styles.container}>
        <div className={styles.closingBannerInner}>
          <div>
            <Heading as="h2" className={styles.closingTitle}>
              Let's Build a Training Program That Fits Your Team
            </Heading>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CorporateTraining() {
  return (
    <Layout
      title="Corporate Training"
      description="Practical, instructor-led corporate training for engineering teams. On-site, online, or fully customized learning programs."
    >
      <HeroSection />
      <TrustSection />
      <WhySection />
      <ProcessSection />
      <FaqContactSection />
    </Layout>
  );
}

import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import ResumeReviewContactForm from '@site/src/components/ResumeReviewContactForm';
import styles from './corporate-training.module.css';
import pageStyles from './resume-review.module.css';

const heroHighlights = [
  {
    title: 'Detailed Written Feedback',
    description: 'A comprehensive report covering content, structure, and presentation.',
  },
  {
    title: 'ATS-Ready Formatting',
    description: 'Recommendations to help your resume pass Applicant Tracking Systems.',
  },
  {
    title: 'Recruiter-Level Insight',
    description: 'Feedback grounded in what recruiters and hiring managers actually look for.',
  },
];

const whyItems = [
  { title: 'ATS Optimization', description: 'Improve your resume for Applicant Tracking Systems.', icon: 'ats' },
  { title: 'Technical Feedback', description: 'Receive detailed feedback on technical content, projects, and achievements.', icon: 'technical' },
  { title: 'Recruiter Perspective', description: 'Understand what recruiters and hiring managers expect.', icon: 'recruiter' },
  { title: 'Actionable Recommendations', description: 'Receive practical improvements you can implement immediately.', icon: 'actionable' },
];

const audiences = [
  'Fresh Graduates',
  'Software Engineers',
  'QA Engineers',
  'SDETs',
  'Automation Engineers',
  'Senior Engineers',
  'Team Leads',
  'Engineering Managers',
];

const deliverables = [
  'Resume Review Report',
  'ATS Optimization Suggestions',
  'Technical Content Review',
  'Formatting Recommendations',
  'Project Feedback',
  'Skills Assessment',
  'Personalized Recommendations',
];

const steps = [
  { step: '1', title: 'Submit Your Resume', description: 'Share your resume along with a bit about your experience and goals.' },
  { step: '2', title: 'We Review Your Resume', description: 'An experienced software engineering professional reviews your resume in detail.' },
  { step: '3', title: 'Detailed Analysis & Recommendations', description: 'We assess content, structure, formatting, and technical presentation.' },
  { step: '4', title: 'Receive Personalized Feedback', description: 'You get a detailed report with practical, actionable improvements.' },
];

const faqs = [
  {
    question: 'How long does the review take?',
    answer: 'Most reviews are completed within a few business days of submission.',
  },
  {
    question: 'Who reviews my resume?',
    answer: 'Your resume is reviewed by experienced software engineering professionals familiar with the roles you are targeting.',
  },
  {
    question: 'Can I submit multiple versions?',
    answer: 'Yes, you can submit additional versions for review — just let us know in your submission.',
  },
  {
    question: 'Will I receive written feedback?',
    answer: 'Yes. You will receive a detailed written report covering content, formatting, and technical presentation.',
  },
  {
    question: 'Can I ask follow-up questions?',
    answer: 'Yes, you can follow up with questions about the feedback you receive.',
  },
  {
    question: 'Is my resume kept confidential?',
    answer: 'Yes. Your resume and personal information are kept strictly confidential and used only for the purpose of the review.',
  },
];

const accentClasses = ['accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6'];

function accentFor(index) {
  return accentClasses[index % accentClasses.length];
}

function WhyIcon({ name }) {
  const icons = {
    ats: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    technical: <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />,
    recruiter: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /><path d="M16 5l1.5 1.5L15 9" /></>,
    actionable: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="3.2" /><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21" /></>,
  };
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
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
              Resume Review
            </Heading>
            <p className={styles.heroSubtitle}>
              Get detailed, actionable feedback on your resume from experienced software
              engineering professionals.
            </p>
            <p className={styles.heroSubtitle}>
              Whether you're applying for your first role, targeting senior engineering
              positions, or preparing for product companies, we'll help you present your
              experience with confidence.
            </p>
            <div className={styles.heroButtons}>
              <Link className={styles.secondaryBtn} to="#contact">Submit Your Resume</Link>
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

function WhySection() {
  return (
    <section className={styles.why}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>Why Choose Our Resume Review</Heading>
        </div>
        <div className={styles.whyBento}>
          {whyItems.map((item, index) => (
            <div
              key={item.title}
              className={`${styles.whyTileLarge} ${styles[accentFor(index)]}`}
            >
              <div className={styles.whyIcon}>
                <WhyIcon name={item.icon} />
              </div>
              <div className={pageStyles.whyTileText}>
                <span className={styles.whyLabel}>{item.title}</span>
                <p className={pageStyles.whyTileDesc}>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
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

function DeliverablesSection() {
  return (
    <section className={styles.process}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>What You'll Receive</Heading>
        </div>
        <div className={styles.whyBento}>
          {deliverables.map((label, index) => (
            <div
              key={label}
              className={`${styles.whyTileSmall} ${styles[accentFor(index)]}`}
            >
              <div className={styles.whyIcon}>
                <CheckIcon />
              </div>
              <span className={styles.whyLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section className={styles.why}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>Review Process</Heading>
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
              <Heading as="h2" className={styles.contactFormTitle}>Submit Your Resume</Heading>
              <p className={styles.contactFormSubtitle}>
                Tell us about yourself and attach your resume — we'll get back to you with
                detailed feedback.
              </p>
              <ResumeReviewContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ResumeReview() {
  return (
    <Layout
      title="Resume Review"
      description="Get detailed, actionable feedback on your resume from experienced software engineering professionals. ATS optimization, technical feedback, and recruiter-level insight."
    >
      <HeroSection />
      <WhySection />
      <AudienceSection />
      <DeliverablesSection />
      <ProcessSection />
      <FaqContactSection />
    </Layout>
  );
}

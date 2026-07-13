import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import MockInterviewContactForm from '@site/src/components/MockInterviewContactForm';
import styles from './corporate-training.module.css';

const heroHighlights = [
  {
    title: 'Realistic Simulations',
    description: 'Interviews structured to closely mirror real technical interview rounds.',
  },
  {
    title: 'Detailed Written Feedback',
    description: 'Actionable feedback on problem-solving, communication, and technical skills.',
  },
  {
    title: 'Experienced Interviewers',
    description: 'Sessions conducted by experienced software engineering professionals.',
  },
];

const whyItems = [
  { title: 'Real Interview Experience', description: 'Experience interviews that closely simulate real technical interviews.', icon: 'real' },
  { title: 'Personalized Feedback', description: 'Receive detailed feedback on your problem-solving approach, communication, and technical skills.', icon: 'feedback' },
  { title: 'Interview Strategy', description: 'Learn techniques to improve confidence, structure answers, and handle difficult questions.', icon: 'strategy' },
  { title: 'Actionable Improvement Plan', description: "Walk away with clear recommendations to improve before your actual interviews.", icon: 'plan' },
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

const interviewTypes = [
  'Data Structures & Algorithms',
  'System Design',
  'Test Automation',
  'Software Testing',
  'Behavioral Interviews',
  'API & Backend Development',
  'Frontend Development',
  'Custom Interview',
];

const steps = [
  { step: '1', title: 'Book Your Session', description: 'Choose your interview type and share your background and goals.' },
  { step: '2', title: 'Attend the Live Mock Interview', description: 'Go through a realistic interview simulation with an experienced interviewer.' },
  { step: '3', title: 'Receive Detailed Feedback', description: 'Get a written report covering your problem-solving, communication, and technical skills.' },
  { step: '4', title: 'Improve & Prepare for Your Next Interview', description: 'Apply the feedback and recommendations to walk into your next interview with confidence.' },
];

const faqs = [
  {
    question: 'How long is the interview?',
    answer: 'Most mock interviews run 45–60 minutes, followed by time for feedback and questions.',
  },
  {
    question: 'Which interview types are available?',
    answer: 'We cover Data Structures & Algorithms, System Design, Test Automation, Software Testing, Behavioral, API & Backend, Frontend, and Custom interviews.',
  },
  {
    question: 'Who conducts the interviews?',
    answer: 'Sessions are conducted by experienced software engineering professionals familiar with the interview processes at top companies.',
  },
  {
    question: 'Will I receive written feedback?',
    answer: 'Yes. You will receive a detailed written report covering your problem-solving approach, communication, and technical skills.',
  },
  {
    question: 'Can I choose my interview topic?',
    answer: "Yes. You can select your preferred interview type when booking, including a custom topic if you don't see it listed.",
  },
  {
    question: 'Can I schedule interviews on weekends?',
    answer: 'Yes, we offer flexible scheduling including weekends — just let us know your preferred date and time slot.',
  },
  {
    question: 'Is the interview conducted online?',
    answer: 'Yes, all mock interviews are conducted live online via video call.',
  },
];

const accentClasses = ['accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6'];

function accentFor(index) {
  return accentClasses[index % accentClasses.length];
}

function WhyIcon({ name }) {
  const icons = {
    real: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>,
    feedback: <><path d="M21 11.5a8.5 8.5 0 1 1-4.1-7.3" /><path d="M21 4l-9 9-3-3" /></>,
    strategy: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></>,
    plan: <><path d="M9 11l3 3L22 4" /><path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" /></>,
  };
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function TypeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 17l6-6-6-6M12 19h8" />
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
              Mock Interview
            </Heading>
            <p className={styles.heroSubtitle}>
              Practice real software engineering interviews with experienced interviewers and
              receive detailed, actionable feedback to improve your interview performance.
            </p>
            <p className={styles.heroSubtitle}>
              Whether you're preparing for product companies, startups, or senior engineering
              roles, we'll help you interview with confidence.
            </p>
            <div className={styles.heroButtons}>
              <Link className={styles.secondaryBtn} to="#contact">Book Your Mock Interview</Link>
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
          <Heading as="h2" className={styles.sectionTitle}>Why Choose Our Mock Interview</Heading>
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
              <span className={styles.whyLabel}>{item.title}</span>
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

function InterviewTypesSection() {
  return (
    <section className={styles.process}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>Interview Types</Heading>
        </div>
        <div className={styles.whyBento}>
          {interviewTypes.map((label, index) => (
            <div
              key={label}
              className={`${styles.whyTileSmall} ${styles[accentFor(index)]}`}
            >
              <div className={styles.whyIcon}>
                <TypeIcon />
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
          <Heading as="h2" className={styles.sectionTitle}>Interview Process</Heading>
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
              <Heading as="h2" className={styles.contactFormTitle}>Book Mock Interview</Heading>
              <p className={styles.contactFormSubtitle}>
                Tell us about your background and goals — we'll schedule your live mock interview.
              </p>
              <MockInterviewContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function MockInterview() {
  return (
    <Layout
      title="Mock Interview"
      description="Practice real software engineering interviews with experienced interviewers and receive detailed, actionable feedback to improve your interview performance."
    >
      <HeroSection />
      <WhySection />
      <AudienceSection />
      <InterviewTypesSection />
      <ProcessSection />
      <FaqContactSection />
    </Layout>
  );
}

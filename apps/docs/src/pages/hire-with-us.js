import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import HireWithUsContactForm from '@site/src/components/HireWithUsContactForm';
import styles from './corporate-training.module.css';

const heroHighlights = [
  {
    title: 'Curated, Not Crowdsourced',
    description: 'Every candidate we send is matched against your actual role requirements.',
  },
  {
    title: 'Verified Hands-On Skills',
    description: 'Candidates have shipped real, project-based work — not just a resume claim.',
  },
  {
    title: 'Affordable Resume Access',
    description: 'View candidate resumes at a fraction of traditional recruiter or job-board pricing.',
  },
];

const whyItems = [
  { title: 'Curated Hiring', description: "We pre-screen against your role's requirements, so only qualified matches reach your inbox.", icon: 'curated' },
  { title: 'Affordable Resume Views', description: 'Access verified candidate resumes without paying per-seat recruiter fees or job-board bulk pricing.', icon: 'resume' },
  { title: 'Verified Hands-On Skills', description: 'Every candidate has completed real, project-based coursework — proof of ability, not just a claim on paper.', icon: 'verified' },
  { title: 'Faster Time-to-Hire', description: 'Skip weeks of cold sourcing. Get a curated shortlist built around your role in days, not months.', icon: 'speed' },
  { title: 'Direct Job Posting', description: 'Post open roles directly to an active community of engineers who are actively building and learning.', icon: 'post' },
  { title: 'No Long-Term Contracts', description: "Pay for what you use — no annual recruiter retainer or lock-in required to get started.", icon: 'flexible' },
];

const audiences = [
  'Startups',
  'Growing Engineering Teams',
  'Recruiting Agencies',
  'HR & Talent Acquisition',
  'Scaling Enterprises',
  'Hiring Managers',
];

const steps = [
  { step: '1', title: 'Tell Us Who You Need', description: 'Share the role, seniority, must-have skills, and timeline — takes less than five minutes.' },
  { step: '2', title: 'We Curate a Shortlist', description: 'We match your requirements against verified, hands-on-skilled candidates in our talent pool.' },
  { step: '3', title: 'Review Resumes & Shortlist', description: 'Browse curated resumes affordably and shortlist the candidates worth a conversation.' },
  { step: '4', title: 'Interview & Hire', description: 'We help coordinate scheduling so you can move from shortlist to offer without the back-and-forth.' },
];

const faqs = [
  {
    question: 'How is this different from a job board?',
    answer: "We don't just list your role and wait — we curate a shortlist matched to your requirements, so you spend time interviewing, not sifting through hundreds of unqualified applicants.",
  },
  {
    question: 'How much does it cost?',
    answer: "Resume access is priced to be affordable compared to traditional recruiter fees, and there's no long-term contract required. Reach out and we'll walk you through pricing for your hiring volume.",
  },
  {
    question: 'What kind of roles can I hire for?',
    answer: 'Software engineers, AI/ML and AI engineering roles, QA engineers and SDETs, DevOps, and other technical roles aligned with the skills taught across our courses.',
  },
  {
    question: 'How do you verify candidate skills?',
    answer: 'Candidates in our talent pool have completed real, project-based coursework — not just a certificate of completion, but demonstrated hands-on work you can evaluate.',
  },
  {
    question: 'How fast can I get candidates?',
    answer: "Timelines depend on role specificity, but most hiring teams receive a curated shortlist within days of submitting their requirements, not weeks.",
  },
  {
    question: 'Can I post a job directly instead of requesting a shortlist?',
    answer: 'Yes — reach out and we can also set you up to post roles directly to our engineer community.',
  },
];

const accentClasses = ['accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6'];

function accentFor(index) {
  return accentClasses[index % accentClasses.length];
}

function WhyIcon({ name }) {
  const icons = {
    curated: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" fill="currentColor" /></>,
    resume: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>,
    verified: <><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></>,
    speed: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
    post: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></>,
    flexible: <path d="M9 11l3 3L22 4M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" />,
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
              Hire Engineers Who've Already Proven They Can Build
            </Heading>
            <p className={styles.heroSubtitle}>
              Skip the resume pile. Every candidate in our talent pool has completed real,
              project-based coursework — not just passed a whiteboard round.
            </p>
            <p className={styles.heroSubtitle}>
              Curated shortlists, verified hands-on skills, and affordable resume access — built
              for startups and growing engineering teams that need to hire well, not just fast.
            </p>
            <div className={styles.heroButtons}>
              <Link className={styles.secondaryBtn} to="#contact">Get a Curated Shortlist</Link>
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
          <Heading as="h2" className={styles.sectionTitle}>Why Hire Through Sypher</Heading>
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
          <Heading as="h2" className={styles.sectionTitle}>How Hiring With Us Works</Heading>
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
              <Heading as="h2" className={styles.contactFormTitle}>Get a Curated Shortlist</Heading>
              <p className={styles.contactFormSubtitle}>
                Tell us who you're hiring for, and we'll put together a shortlist of verified,
                hands-on-skilled candidates.
              </p>
              <HireWithUsContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HireWithUs() {
  return (
    <Layout
      title="Hire with Us"
      description="Hire engineers with verified, hands-on skills. Curated shortlists, affordable resume access, and no long-term contracts — built for startups and growing engineering teams."
    >
      <HeroSection />
      <AudienceSection />
      <WhySection />
      <ProcessSection />
      <FaqContactSection />
    </Layout>
  );
}

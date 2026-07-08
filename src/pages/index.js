import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import { useAuth } from '@site/src/contexts/AuthContext';
import RedirectIfAuthed from '@site/src/components/RedirectIfAuthed';
import styles from './index.module.css';

const stats = [
  { value: '8', label: 'Courses' },
  { value: '300+', label: 'Lessons' },
  { value: '20+', label: 'Projects' },
  { value: '200+', label: 'Exercises' },
  { value: '6', label: 'Languages' },
];

const pillars = [
  {
    icon: '📖',
    title: 'Text-First, Deep Learning',
    description: 'No passive videos. Every concept is explained in clear, annotated text with real code — the way engineers actually learn best. You read, you code, you build.',
  },
  {
    icon: '🧠',
    title: 'Built for Modern AI Engineering',
    description: 'Deep dives into LLMs, agents, MCP, and RAG — the tools and patterns shaping how AI systems are actually built today, not a decade-old curriculum.',
  },
  {
    icon: '🎯',
    title: 'Interview-Ready Projects',
    description: 'Real-world system design, coding challenges, and production-grade portfolio projects that build the skills employers actually look for.',
  },
];

const approach = [
  {
    step: '1',
    title: 'Learn the Concept',
    description: 'Every topic starts with a clear mental model — stories, analogies, and diagrams that build intuition before you write a single line of code.',
  },
  {
    step: '2',
    title: 'Build Something Real',
    description: 'Annotated, progressive code examples. You never see unexplained code — every line is walked through, and every example is production-quality.',
  },
  {
    step: '3',
    title: 'Avoid Common Mistakes',
    description: 'Each lesson surfaces the pitfalls that trip up most engineers. You learn what to watch for and how to debug when things go wrong.',
  },
  {
    step: '4',
    title: 'Practice & Test Yourself',
    description: 'Exercises, quizzes, and challenges at every level — from quick checks to deep coding problems. Practice is built into every module.',
  },
];

const accentClasses = ['accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6'];

function accentFor(index) {
  return accentClasses[index % accentClasses.length];
}

function HeroSection() {
  const { siteConfig } = useDocusaurusContext();
  const { user } = useAuth();
  const startUrl = user
    ? '/dashboard'
    : `/login?redirect=${encodeURIComponent('/docs/python-for-ai-engineers/')}`;
  return (
    <header className={styles.hero}>
      <div className={styles.heroBg} />
      <div className={styles.container}>
        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>
            <span className={styles.heroBadge}>Learn by Building</span>
            <Heading as="h1" className={styles.heroTitle}>
              Master AI Engineering<br />
              <span className={styles.heroHighlight}>Through Real Projects</span>
            </Heading>
            <p className={styles.heroSubtitle}>
              A complete, hands-on curriculum — from Python fundamentals to production AI systems.
              Text-first lessons, real projects, and interview-ready skills. No fluff, no filler.
            </p>
            <div className={styles.heroButtons}>
              <Link
                className={styles.primaryBtn}
                to={startUrl}>
                Start Learning →
              </Link>
              <Link
                className={styles.secondaryBtn}
                to="#courses">
                Browse Courses
              </Link>
            </div>
          </div>
          <div className={styles.heroVisual}>
            {pillars.map((pillar, index) => (
              <div
                key={pillar.title}
                className={`${styles.heroTile} ${styles[accentFor(index)]}`}
              >
                <span className={styles.heroTileIcon}>{pillar.icon}</span>
                <span className={styles.heroTileTitle}>{pillar.title}</span>
                <p className={styles.heroTileDesc}>{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function StatsBar() {
  return (
    <section className={styles.trustBand}>
      <div className={styles.container}>
        <div className={styles.statsGrid}>
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`${styles.statBadge} ${styles[accentFor(index)]}`}
            >
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PillarsSection() {
  return (
    <section className={styles.pillars}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>Why Sypher?</Heading>
          <p className={styles.sectionSubtitle}>
            We built the curriculum we wish we had — practical, deep, and built for the way engineers actually learn.
          </p>
        </div>
        <div className={styles.pillarGrid}>
          {pillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className={`${styles.pillarCard} ${styles[accentFor(index)]}`}
            >
              <span className={styles.pillarIcon}>{pillar.icon}</span>
              <Heading as="h3" className={styles.pillarTitle}>{pillar.title}</Heading>
              <p className={styles.pillarDesc}>{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ApproachSection() {
  return (
    <section className={styles.approach}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>How Every Lesson Works</Heading>
          <p className={styles.sectionSubtitle}>
            A consistent four-part structure across every topic — so you always know what to expect and how to progress.
          </p>
        </div>
        <div className={styles.timeline}>
          <div className={styles.timelineLine} aria-hidden="true" />
          {approach.map((item) => (
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

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title="Learn AI Engineering & System Design"
      description="Sypher is a hands-on learning platform for AI engineering, system design, Python, and software engineering. Text-first lessons with real projects.">
      <RedirectIfAuthed>
        <HeroSection />
        <StatsBar />
        <PillarsSection />
        <div id="courses">
          <HomepageFeatures />
        </div>
        <ApproachSection />
      </RedirectIfAuthed>
    </Layout>
  );
}
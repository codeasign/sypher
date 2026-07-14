import Link from 'next/link';
import styles from './styles.module.css';

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

const accentClasses = ['accent1', 'accent2', 'accent3'] as const;

function accentFor(index: number) {
  return accentClasses[index % accentClasses.length];
}

export default function HeroSection() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroBg} />
      <div className={styles.container}>
        <div className={styles.heroGrid}>
          <div className={styles.heroContent}>
            <span className={styles.heroBadge}>Learn by Building</span>
            <h1 className={styles.heroTitle}>
              Master AI Engineering<br />
              <span className={styles.heroHighlight}>Through Real Projects</span>
            </h1>
            <p className={styles.heroSubtitle}>
              A complete, hands-on curriculum — from Python fundamentals to production AI systems.
              Text-first lessons, real projects, and interview-ready skills. No fluff, no filler.
            </p>
            <div className={styles.heroButtons}>
              <Link className={styles.primaryBtn} href="/login">
                Start Learning →
              </Link>
              <Link className={styles.secondaryBtn} href="#courses">
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

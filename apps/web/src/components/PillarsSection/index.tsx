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

export default function PillarsSection() {
  return (
    <section className={styles.pillars}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Why Sypher?</h2>
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
              <h3 className={styles.pillarTitle}>{pillar.title}</h3>
              <p className={styles.pillarDesc}>{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

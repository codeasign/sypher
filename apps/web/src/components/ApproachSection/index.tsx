import styles from './styles.module.css';

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

export default function ApproachSection() {
  return (
    <section className={styles.approach}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>How Every Lesson Works</h2>
          <p className={styles.sectionSubtitle}>
            A consistent four-part structure across every topic — so you always know what to expect and how to progress.
          </p>
        </div>
        <div className={styles.timeline}>
          <div className={styles.timelineLine} aria-hidden="true" />
          {approach.map((item) => (
            <div key={item.step} className={styles.timelineStep}>
              <div className={styles.timelineCircle}>{item.step}</div>
              <h3 className={styles.timelineTitle}>{item.title}</h3>
              <p className={styles.timelineDesc}>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

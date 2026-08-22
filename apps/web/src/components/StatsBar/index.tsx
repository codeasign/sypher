import styles from './styles.module.css';

const stats = [
  { value: '8', label: 'Courses' },
  { value: '300+', label: 'Lessons' },
  { value: '20+', label: 'Projects' },
  { value: '200+', label: 'Exercises' },
  { value: '6', label: 'Languages' },
];

const accentClasses = ['accent1', 'accent2', 'accent3', 'accent4', 'accent5'] as const;

function accentFor(index: number) {
  return accentClasses[index % accentClasses.length];
}

export default function StatsBar() {
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

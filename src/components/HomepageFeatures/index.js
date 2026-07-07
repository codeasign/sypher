import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

/**
 * Fetch runtime access control config, cached after first load.
 */
let cachedConfig = null;
let configPromise = null;

function fetchConfig() {
  if (cachedConfig) return Promise.resolve(cachedConfig);
  if (configPromise) return configPromise;
  configPromise = fetch('/access-control.json')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch access-control.json');
      return res.json();
    })
    .then((data) => {
      cachedConfig = data;
      return data;
    })
    .catch(() => {
      cachedConfig = { freeCourses: [], freeSections: 3 };
      return cachedConfig;
    });
  return configPromise;
}

const courses = [
  {
    title: 'Python for AI Engineers',
    description: 'A complete, job-ready Python course for building AI applications — from your first script to production-grade AI pipelines.',
    url: '/course/python-for-ai-engineers',
    difficulty: 'Beginner to Advanced',
    hours: '50–70h',
    topics: ['Python', 'NumPy', 'Pandas', 'FastAPI', 'LLMs', 'Testing'],
    gradient: 'linear-gradient(135deg, #1E4D8C 0%, #357ABD 100%)',
    icon: '🐍',
    tag: 'Flagship',
  },
  {
    title: 'Agentic AI Fundamentals',
    description: 'Bridge prompt engineering and autonomous agents. Build memory, tools, planning loops, multi-agent systems, and MCP servers.',
    url: '/course/agentic-ai-fundamentals',
    difficulty: 'Intermediate to Advanced',
    hours: '45–60h',
    topics: ['Agents', 'MCP', 'Tool Use', 'Planning', 'Guardrails'],
    gradient: 'linear-gradient(135deg, #6A1B9A 0%, #9C27B0 100%)',
    icon: '🤖',
    tag: 'Trending',
  },
  {
    title: 'System Design Fundamentals',
    description: 'FAANG-level guide to system design. From scalability and consistency to distributed systems patterns and interview frameworks.',
    url: '/course/system-design-fundamentals',
    difficulty: 'Intermediate',
    hours: '35–50h',
    topics: ['Scalability', 'Databases', 'Microservices', 'Patterns'],
    gradient: 'linear-gradient(135deg, #E65100 0%, #FF8F00 100%)',
    icon: '🏗️',
    tag: 'Popular',
  },
  {
    title: 'Git & GitHub Actions',
    description: 'Version control from first commit to production CI/CD. Master branching, collaboration, and automated deployment pipelines.',
    url: '/course/git-github-actions',
    difficulty: 'Beginner to Advanced',
    hours: '30–42h',
    topics: ['Git', 'GitHub', 'CI/CD', 'Actions', 'Deployment'],
    gradient: 'linear-gradient(135deg, #1A237E 0%, #3949AB 100%)',
    icon: '🔀',
    tag: 'Essential',
  },
  {
    title: 'AI Engineering Crash Course',
    description: 'Build real AI applications with LLM APIs, local models, MCP servers, and autonomous agents — API call to production system.',
    url: '/course/ai-engineering-crash-course',
    difficulty: 'Intermediate to Advanced',
    hours: '35–50h',
    topics: ['LLMs', 'RAG', 'Agents', 'MCP', 'Deploy'],
    gradient: 'linear-gradient(135deg, #00695C 0%, #26A69A 100%)',
    icon: '⚡',
    tag: 'Hands-On',
  },
  {
    title: 'Build with AI',
    description: '20+ real-world projects: mini apps, intermediate tools, production systems, and portfolio-grade platforms — all with AI.',
    url: '/course/build-with-ai',
    difficulty: 'All Levels',
    hours: '50–80h',
    topics: ['10+ Projects', 'RAG', 'Agents', 'SaaS', 'MCP'],
    gradient: 'linear-gradient(135deg, #4A148C 0%, #7B1FA2 100%)',
    icon: '🛠️',
    tag: 'Project-Based',
  },
  {
    title: 'Software Engineering',
    description: 'SOLID principles and 20+ design patterns in JavaScript, TypeScript, Python, Java, C#, and Rust — with multi-language examples.',
    url: '/course/software-engineering',
    difficulty: 'All Levels',
    hours: '40–55h',
    topics: ['SOLID', 'Patterns', '6 Languages', 'Clean Code'],
    gradient: 'linear-gradient(135deg, #B71C1C 0%, #E53935 100%)',
    icon: '📐',
    tag: 'Multi-Lang',
  },
  {
    title: 'Coding Bootcamp',
    description: 'Master coding interview patterns — arrays, trees, graphs, DP, and more. Hundreds of exercises from easy to hard with solutions.',
    url: '/course/coding-bootcamp',
    difficulty: 'Beginner to Advanced',
    hours: '60–90h',
    topics: ['Algorithms', 'Data Structures', 'LeetCode', 'Patterns'],
    gradient: 'linear-gradient(135deg, #0D47A1 0%, #1565C0 100%)',
    icon: '💻',
    tag: 'Interview Prep',
  },
];

function CourseCard({ title, description, url, difficulty, hours, topics, gradient, icon, tag, isFree, showDuration }) {
  return (
    <Link to={url} className={styles.cardLink} style={{ textDecoration: 'none', color: 'inherit' }}>
      <article className={styles.card} style={{ '--card-gradient': gradient }}>
        <div className={styles.cardHeader}>
          <span className={styles.cardIcon}>{icon}</span>
          {isFree ? (
            <span className={styles.freeTag}>Free</span>
          ) : (
            <span className={styles.cardTag}>{tag}</span>
          )}
        </div>
        <Heading as="h3" className={styles.cardTitle}>{title}</Heading>
        <p className={styles.cardDesc}>{description}</p>
        {showDuration && (
          <div className={styles.cardMeta}>
            <span className={styles.metaItem}>{difficulty}</span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaItem}>{hours}</span>
          </div>
        )}
        {!showDuration && (
          <div className={styles.cardMeta}>
            <span className={styles.metaItem}>{difficulty}</span>
          </div>
        )}
        <div className={styles.cardTopics}>
          {topics.map((topic) => (
            <span key={topic} className={styles.topicTag}>{topic}</span>
          ))}
        </div>
        {isFree ? (
          <span className={styles.enrollBtn}>
            Start Learning →
          </span>
        ) : (
          <span className={styles.enrollBtn}>
            View Course →
          </span>
        )}
      </article>
    </Link>
  );
}

export default function HomepageFeatures() {
  const { siteConfig } = useDocusaurusContext();
  const { showDurationOnLanding } = siteConfig.customFields;
  const [freeCourses, setFreeCourses] = useState([]);

  useEffect(() => {
    fetchConfig().then((cfg) => setFreeCourses(cfg.freeCourses ?? []));
  }, []);

  const withSlugs = courses.map((course) => {
    const slug = course.url.replace('/course/', '');
    const isFree = freeCourses.includes(slug);
    return { ...course, slug, isFree };
  });

  const freeCoursesList = withSlugs.filter((c) => c.isFree);
  const premiumCoursesList = withSlugs.filter((c) => !c.isFree);

  return (
    <section className={styles.features}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            Explore Our Courses
          </Heading>
          <p className={styles.sectionSubtitle}>
            From Python fundamentals to production AI systems — every topic is hands-on, text-first, and built for real engineering growth.
          </p>
        </div>

        {freeCoursesList.length > 0 && (
          <>
            <div className={styles.subsectionHeader}>
              <Heading as="h3" className={styles.subsectionTitle}>Free Courses</Heading>
              <span className={styles.subsectionCount}>{freeCoursesList.length} courses</span>
            </div>
            <div className={styles.courseGrid}>
              {freeCoursesList.map((course) => (
                <CourseCard key={course.title} {...course} showDuration={showDurationOnLanding} />
              ))}
            </div>
          </>
        )}

        {premiumCoursesList.length > 0 && (
          <>
            <div className={styles.subsectionHeader}>
              <Heading as="h3" className={styles.subsectionTitle}>Premium Courses</Heading>
              <span className={styles.subsectionCount}>{premiumCoursesList.length} courses</span>
            </div>
            <div className={styles.courseGrid}>
              {premiumCoursesList.map((course) => (
                <CourseCard key={course.title} {...course} showDuration={showDurationOnLanding} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
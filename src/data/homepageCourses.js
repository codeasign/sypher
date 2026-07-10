export const courses = [
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
  {
    title: 'Search Algorithms',
    description: 'A reference course covering the search algorithms every engineer should know cold — from linear scan to A* pathfinding, with implementations in 4 languages.',
    url: '/course/search-algorithms',
    difficulty: 'Beginner to Advanced',
    hours: '12–18h',
    topics: ['Binary Search', 'DFS', 'BFS', 'A*', 'Two-Pointer'],
    gradient: 'linear-gradient(135deg, #00838F 0%, #4DD0E1 100%)',
    icon: '🔍',
    tag: 'New',
  },
  {
    title: 'Sorting Algorithms',
    description: 'A reference course covering the sorting algorithms every engineer should know cold — from Bubble Sort to the Tim Sort hybrid powering every modern language, with implementations in 9 languages.',
    url: '/course/sorting-algorithms',
    difficulty: 'Beginner to Advanced',
    hours: '10–15h',
    topics: ['Merge Sort', 'Quick Sort', 'Heap Sort', 'Radix Sort', 'Tim Sort'],
    gradient: 'linear-gradient(135deg, #4A148C 0%, #7B1FA2 100%)',
    icon: '🔀',
    tag: 'New',
  },
];

let cachedConfig = null;
let configPromise = null;

/**
 * Fetch runtime access control config, cached after first load.
 */
export function fetchAccessControlConfig() {
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

export function withCourseAccess(freeCourses) {
  return courses.map((course) => {
    const slug = course.url.replace('/course/', '');
    const isFree = freeCourses.includes(slug);
    return { ...course, slug, isFree };
  });
}

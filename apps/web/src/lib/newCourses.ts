export const NEW_COURSE_SLUGS = [
  'typescript-for-test-automation',
  'python-for-test-automation',
  'sorting-algorithms',
  'ai-for-quality-engineering',
  'ai-qe-ragas',
  'search-algorithms',
  'learn-typescript',
  'api-testing-java',
  'api-testing-python',
  'ai-llm-testing',
  'api-testing-typescript',
  'solid-principles',
  'build-with-ai',
  'playwright-test-automation',
] as const;

export const NEW_COURSE_SLUG_SET: ReadonlySet<string> = new Set(NEW_COURSE_SLUGS);

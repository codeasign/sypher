import React from 'react';
import CodeEditor from '@site/src/components/CoreEditor/Index';
import styles from './styles.module.css';

interface TestCase { stdin: string; expectedOutput: string; }
interface ProblemMeta { id: string; timeLimitSeconds: number; memoryLimitKb: number; }

interface DetailsPageWithIDEProps {
  meta: ProblemMeta;
  testCases: TestCase[];
  starterCode: Record<string, string>;
  harness?: Record<string, string>;
  defaultLanguage?: string;
  solutions: React.ReactNode;
  children: React.ReactNode;
}

export default function DetailsPageWithIDE({
  meta,
  testCases,
  starterCode,
  harness,
  defaultLanguage = 'python311',
  solutions,
  children,
}: DetailsPageWithIDEProps): JSX.Element {
  return (
    <div className={styles.container}>
      <div className={styles.explanationSection}>{children}</div>
      <div className={styles.ideSection}>
        <CodeEditor
          meta={meta}
          testCases={testCases}
          starterCode={starterCode}
          harness={harness}
          defaultLanguage={defaultLanguage}
        />
      </div>
      <div className={styles.solutionsSection}>
        <h2>Solutions</h2>
        {solutions}
      </div>
    </div>
  );
}

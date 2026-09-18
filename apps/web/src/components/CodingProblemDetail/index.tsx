'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CodingIDE from '@/components/CodingIDE';
import CodingProblemMarkdown from '@/components/CodingProblemMarkdown';
import type { CodingProblemDetail as CodingProblemDetailData } from '@/data/codingProblems';
import styles from './styles.module.css';

const DIFFICULTY_CLASS: Record<string, string> = {
  easy: styles.difficultyEasy,
  medium: styles.difficultyMedium,
  hard: styles.difficultyHard,
};

function difficultyLabel(difficulty: string): string {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

type Tab = 'ide' | 'solutions' | 'code';

// bodyMd's first line is almost always "# <Title>" (carried over from the
// migrated apps/docs exercise files) — redundant and visually doubled-up
// with the page's own <h1>{problem.title}</h1> above, so it's stripped
// here rather than in the DB (non-destructive; other consumers of bodyMd
// may still want the heading).
function stripLeadingTitleHeading(bodyMd: string, title: string): string {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return bodyMd.replace(new RegExp(`^\\s*#\\s+${escaped}\\s*\\r?\\n+`), '');
}

// bodyMd also carries a leading "**Difficulty:** Easy" line right after the
// title — redundant with the difficulty badge already shown in the header
// next to the title, so it's stripped the same non-destructive way.
function stripLeadingDifficultyLine(bodyMd: string): string {
  return bodyMd.replace(/^\s*\*\*Difficulty:?\*\*[^\n]*\r?\n+/i, '');
}

export default function CodingProblemDetail({ problem }: { problem: CodingProblemDetailData }): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('ide');
  // LeetCode-style fullscreen: expands the Problem/IDE split to a fixed
  // full-viewport overlay instead of navigating anywhere else — Escape or
  // the exit button drops back to the normal in-page layout.
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    if (!fullscreen) return;
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setFullscreen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen]);
  // "shared" is the writeup prose (Overview/Brute Force/Optimal/Deep Dive),
  // common to every language — not itself a language, so it lives on its
  // own Solutions tab, separate from the per-language Code tab (see
  // seed-coding-problems.ts's solutionsMd shape).
  const { shared: sharedWriteup, ...perLanguageSolutions } = problem.solutionsMd;
  const solutionLanguages = Object.keys(perLanguageSolutions);
  const [solutionLanguage, setSolutionLanguage] = useState(solutionLanguages[0] ?? '');

  return (
    <div className={styles.page}>
      <Link href="/practice-coding" className={styles.backLink}>
        ← Back to Coding Problems
      </Link>
      <div className={styles.header}>
        <h1 className={styles.title}>{problem.title}</h1>
        <span className={styles.categoryTag}>{problem.categoryLabel}</span>
        <span className={`${styles.difficultyTag} ${DIFFICULTY_CLASS[problem.difficulty] ?? ''}`}>{difficultyLabel(problem.difficulty)}</span>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Problem view">
        <button type="button" role="tab" aria-selected={tab === 'ide'} className={`${styles.tab} ${tab === 'ide' ? styles.tabActive : ''}`} onClick={() => setTab('ide')}>
          Problem
        </button>
        <button type="button" role="tab" aria-selected={tab === 'solutions'} className={`${styles.tab} ${tab === 'solutions' ? styles.tabActive : ''}`} onClick={() => setTab('solutions')}>
          Solutions
        </button>
        <button type="button" role="tab" aria-selected={tab === 'code'} className={`${styles.tab} ${tab === 'code' ? styles.tabActive : ''}`} onClick={() => setTab('code')}>
          Code
        </button>
      </div>

      {tab === 'ide' && (
        <div className={`${styles.ideLayout} ${fullscreen ? styles.ideLayoutFullscreen : ''}`}>
          {fullscreen && <p className={styles.fullscreenHint}>Press <kbd className={styles.kbd}>Esc</kbd> to go back</p>}
          <div className={`${styles.description} ${styles.thinScroll}`}>
            <CodingProblemMarkdown content={stripLeadingDifficultyLine(stripLeadingTitleHeading(problem.bodyMd, problem.title))} />
          </div>
          <div className={styles.editorPane}>
            <CodingIDE
              problemId={problem.id}
              timeLimitSeconds={problem.timeLimitSeconds}
              memoryLimitKb={problem.memoryLimitKb}
              sampleTestCases={problem.sampleTestCases}
              testCaseCount={problem.testCaseCount}
              starterCode={problem.starterCode}
              harness={problem.harness}
              defaultLanguage={problem.defaultLanguage}
              fullscreen={fullscreen}
              onToggleFullscreen={() => setFullscreen((v) => !v)}
            />
          </div>
        </div>
      )}

      {tab === 'solutions' && (
        <div className={styles.solutions}>
          {sharedWriteup ? (
            <div className={styles.solutionCard}>
              <CodingProblemMarkdown content={sharedWriteup} />
            </div>
          ) : (
            <p className={styles.emptyText}>No solution published yet.</p>
          )}
        </div>
      )}

      {tab === 'code' && (
        <div className={styles.solutions}>
          {solutionLanguages.length === 0 ? (
            <p className={styles.emptyText}>No solution code published yet.</p>
          ) : (
            <div className={styles.solutionCard}>
              <div className={styles.solutionCodeHeader}>
                <span className={styles.solutionCodeLabel}>Code</span>
                <div className={styles.languagePills} role="tablist" aria-label="Solution language">
                  {solutionLanguages.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      role="tab"
                      aria-selected={lang === solutionLanguage}
                      className={`${styles.languagePill} ${lang === solutionLanguage ? styles.languagePillActive : ''}`}
                      onClick={() => setSolutionLanguage(lang)}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <CodingProblemMarkdown content={perLanguageSolutions[solutionLanguage] ?? ''} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

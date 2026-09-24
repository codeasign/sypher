'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { startMockAttempt, submitMockAttempt, type MockExamSummary, type MockTestQuestionView, type MockTestResultResponse } from '@/data/mockTests';
import { LogoutMenuIcon, TimerIcon } from '@/components/icons/ActionIcons';
import MiniBars from '@/components/charts/MiniBars';
import RankedBars from '@/components/charts/RankedBars';
import SegmentedRing from '@/components/charts/SegmentedRing';
import EmptyState from '@/components/EmptyState';
import styles from './styles.module.css';

// Fixed-order categorical hues (identity, never status) -- see the chart
// tokens in globals.css and the dataviz skill's palette check. Row/bar order
// picks the slot; never reassigned when the underlying list is filtered.
const CHART_SERIES = [
  'var(--chart-series-1)',
  'var(--chart-series-2)',
  'var(--chart-series-3)',
  'var(--chart-series-4)',
  'var(--chart-series-5)',
  'var(--chart-series-6)',
  'var(--chart-series-7)',
  'var(--chart-series-8)',
];
function seriesColor(index: number): string {
  return CHART_SERIES[index % CHART_SERIES.length];
}

function capitalize(word: string): string {
  return word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

type Phase = 'idle' | 'active' | 'results';
type ReviewFilter = 'correct' | 'incorrect' | 'unanswered';

interface ActiveState {
  attemptId: string;
  startedAtMs: number;
  durationMinutes: number;
  questions: MockTestQuestionView[];
}

// Results are cached per tab so an F5 on the results view restores them
// instead of landing back on the rules card — no resume of ACTIVE attempts
// ever happens: a refresh mid-test returns to idle and that orphaned
// in_progress attempt is abandoned by design.
function resultStorageKey(slug: string): string {
  return `mock-test-result:${slug}`;
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

// Results-screen chart aggregates, computed client-side from the review
// payload (the user's own result — nothing sensitive involved).
interface DifficultyRow {
  difficulty: string;
  correct: number;
  wrong: number;
  unanswered: number;
  total: number;
}

interface DomainRow {
  domain: string;
  correct: number;
  total: number;
  percent: number;
}

function aggregateResults(result: MockTestResultResponse): {
  correct: number;
  wrong: number;
  unanswered: number;
  byDifficulty: DifficultyRow[];
  byDomain: DomainRow[];
} {
  const answeredCount = result.questions.filter((q) => q.selectedAnswer !== null).length;
  const correct = result.questions.filter((q) => q.isCorrect).length;
  const wrong = answeredCount - correct;
  const unanswered = result.totalQuestions - answeredCount;

  const diffMap = new Map<string, DifficultyRow>();
  const domainMap = new Map<string, { domain: string; correct: number; total: number }>();
  for (const q of result.questions) {
    const diff = diffMap.get(q.difficulty) ?? { difficulty: q.difficulty, correct: 0, wrong: 0, unanswered: 0, total: 0 };
    if (q.isCorrect) diff.correct += 1;
    else if (q.selectedAnswer === null) diff.unanswered += 1;
    else diff.wrong += 1;
    diff.total += 1;
    diffMap.set(q.difficulty, diff);

    if (q.domain) {
      const dom = domainMap.get(q.domain) ?? { domain: q.domain, correct: 0, total: 0 };
      if (q.isCorrect) dom.correct += 1;
      dom.total += 1;
      domainMap.set(q.domain, dom);
    }
  }

  const tierRank = (difficulty: string) => DIFFICULTY_ORDER[difficulty] ?? 9;
  const byDifficulty = [...diffMap.values()].sort((a, b) => tierRank(a.difficulty) - tierRank(b.difficulty));
  const byDomain: DomainRow[] = [...domainMap.values()]
    .map((d) => ({ ...d, percent: Math.round((d.correct / d.total) * 100) }))
    .sort((a, b) => b.percent - a.percent || a.domain.localeCompare(b.domain));

  return { correct, wrong, unanswered, byDifficulty, byDomain };
}

export default function MockTestRunner({ exam }: { exam: MockExamSummary }): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>('idle');
  const [active, setActive] = useState<ActiveState | null>(null);
  const [result, setResult] = useState<MockTestResultResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('correct');

  const autoSubmittedRef = useRef(false);

  // Restore a cached result once on mount (refresh-on-results support).
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(resultStorageKey(exam.slug));
      if (!raw) return;
      const parsed = JSON.parse(raw) as MockTestResultResponse;
      if (parsed && parsed.attemptId && Array.isArray(parsed.questions)) {
        setResult(parsed);
        setPhase('results');
      }
    } catch {
      // Corrupt or unavailable storage — fall through to idle.
    }
  }, [exam.slug]);

  const clearCachedResult = useCallback(() => {
    try {
      window.sessionStorage.removeItem(resultStorageKey(exam.slug));
    } catch {
      // Storage unavailable (private mode etc.) — nothing to clean up.
    }
  }, [exam.slug]);

  const submitAnswers = useCallback(
    async (attemptId: string) => {
      setSubmitting(true);
      setError(null);
      try {
        const answers = Object.entries(selections)
          .filter(([, keys]) => keys.length > 0)
          .map(([questionId, selectedAnswer]) => ({ questionId, selectedAnswer }));
        const { error: submitError, result: submitResult } = await submitMockAttempt(attemptId, answers);
        if (submitError || !submitResult) {
          setError(submitError ?? 'Submission failed.');
          return;
        }
        setResult(submitResult);
        setPhase('results');
        try {
          window.sessionStorage.setItem(resultStorageKey(exam.slug), JSON.stringify(submitResult));
        } catch {
          // Storage unavailable — refresh simply won't restore results.
        }
      } finally {
        setSubmitting(false);
        setConfirmingSubmit(false);
      }
    },
    [exam.slug, selections],
  );

  // Keep a ref to the latest submit closure so the countdown's auto-submit
  // at zero never fires a stale one with outdated selections.
  const submitRef = useRef(submitAnswers);
  useEffect(() => {
    submitRef.current = submitAnswers;
  }, [submitAnswers]);

  const startExam = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      clearCachedResult();
      const { error: startError, start } = await startMockAttempt(exam.id);
      if (startError || !start) {
        setError(startError ?? 'Could not start the certification practice exam.');
        return;
      }
      autoSubmittedRef.current = false;
      setSelections({});
      setCurrentIndex(0);
      setConfirmingExit(false);
      setReviewFilter('correct');
      setActive({
        attemptId: start.attemptId,
        startedAtMs: new Date(start.startedAt).getTime(),
        durationMinutes: start.durationMinutes,
        questions: start.questions,
      });
      setRemainingSeconds(start.durationMinutes * 60);
      setPhase('active');
    } finally {
      setStarting(false);
    }
  }, [clearCachedResult, exam.id]);

  // Client-side countdown from the server-issued startedAt + duration
  // (accepted design: tamper-prone but sufficient for practice exams).
  useEffect(() => {
    if (phase !== 'active' || !active) return;
    const deadline = active.startedAtMs + active.durationMinutes * 60_000;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(left);
      if (left <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        void submitRef.current(active.attemptId); // time's up: submit whatever is answered
      }
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [phase, active]);

  // Warn before leaving with a test in progress (can't stop navigation from
  // script, only ask).
  useEffect(() => {
    if (phase !== 'active') return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase]);

  if (phase === 'results' && result) {
    const passed = result.score >= 60;
    const agg = aggregateResults(result);
    const orderedQuestions = [...result.questions]
      .sort((a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 9) - (DIFFICULTY_ORDER[b.difficulty] ?? 9))
      .map((q, i) => ({ ...q, displayNumber: i + 1 })); // stable numbering, independent of the active filter
    const filteredQuestions = orderedQuestions.filter((q) => {
      if (reviewFilter === 'correct') return q.isCorrect;
      if (reviewFilter === 'incorrect') return !q.isCorrect && q.selectedAnswer !== null;
      return q.selectedAnswer === null; // 'unanswered'
    });
    return (
      <div className={styles.runner}>
        <div className={styles.resultsActions}>
          <p className={styles.resultsNote}>These results reflect your most recent attempt. You may retake the exam at any time.</p>
          <button
            type="button"
            className={`${styles.primaryButton} ${styles.retakeButton}`}
            onClick={() => {
              clearCachedResult();
              setResult(null);
              setPhase('idle');
            }}
          >
            Retake this exam
          </button>
        </div>

        <div className={styles.chartsSection}>
          <h2 className={styles.sectionHeading}>Results view</h2>
          <div className={styles.chartsRow}>
            <div className={styles.chartCard}>
              <div className={styles.examHeaderRow}>
                {exam.logoUrl ? (
                  <span className={styles.examLogo}>
                    <Image src={exam.logoUrl} alt="" width={32} height={32} unoptimized />
                  </span>
                ) : (
                  <span className={styles.examLogoFallback} aria-hidden="true">
                    {exam.examCode.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className={styles.examName}>{exam.title}</span>
              </div>
              <div className={styles.compositionRow}>
                <div className={styles.ringGroup}>
                  <SegmentedRing
                    variant="donut"
                    labelPosition="inside"
                    segments={[
                      { key: 'correct', value: agg.correct, color: 'var(--status-success-bg)' },
                      { key: 'wrong', value: agg.wrong, color: 'var(--status-danger-bg)' },
                      { key: 'unanswered', value: agg.unanswered, color: 'var(--status-info-bg)' },
                    ]}
                    total={result.totalQuestions}
                    ariaLabel={`Correct ${agg.correct}, wrong ${agg.wrong}, unanswered ${agg.unanswered} of ${result.totalQuestions}`}
                  />
                  <p className={styles.ringHint}>Breakdown of your answers</p>
                </div>
                <div className={styles.legendRow}>
                  <span className={styles.legendItem}>
                    <span className={`${styles.swatch} ${styles.swatchCorrect}`} /> Correct
                  </span>
                  <span className={styles.legendItem}>
                    <span className={`${styles.swatch} ${styles.swatchWrong}`} /> Wrong
                  </span>
                  <span className={styles.legendItem}>
                    <span className={`${styles.swatch} ${styles.swatchUnanswered}`} /> Unanswered
                  </span>
                </div>
                <div className={`${styles.marksBlock} ${passed ? styles.marksBlockPass : styles.marksBlockFail}`}>
                  <span className={styles.marksLabel}>Marks</span>
                  <span className={styles.marksFraction}>
                    <span className={styles.marksNumerator}>{result.correctCount}</span>
                    <span className={styles.marksSlash}>/</span>
                    <span className={styles.marksDenominator}>{result.totalQuestions}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.chartCard}>
              <h2 className={styles.sectionHeading}>Performance by difficulty</h2>
              <MiniBars
                data={agg.byDifficulty.map((row, index) => ({
                  label: capitalize(row.difficulty),
                  value: Math.round((row.correct / row.total) * 100),
                  color: seriesColor(index),
                }))}
                labelEvery={1}
                tickColor="var(--chart-strong-text)"
                ariaLabel="Percent correct by question difficulty"
              />
              <div className={styles.legendRow}>
                {agg.byDifficulty.map((row, index) => (
                  <span key={row.difficulty} className={styles.legendItem}>
                    <span className={styles.swatch} style={{ background: seriesColor(index) }} /> {capitalize(row.difficulty)} ({row.total} Qs)
                  </span>
                ))}
              </div>
            </div>

            {agg.byDomain.length > 0 && (
              <div className={styles.chartCard}>
                <h2 className={styles.sectionHeading}>Performance by domain</h2>
                <RankedBars
                  data={agg.byDomain.map((row, index) => ({
                    label: row.domain,
                    value: row.percent,
                    color: seriesColor(index),
                  }))}
                  ariaLabel="Percent correct by exam domain"
                />
              </div>
            )}
          </div>
        </div>

        <h2 className={styles.sectionHeading}>Review</h2>
        <div className={styles.tabs} role="tablist" aria-label="Filter review by answer">
          {(
            [
              ['correct', 'Correct', agg.correct],
              ['incorrect', 'Incorrect', agg.wrong],
              ['unanswered', 'Unattempted', agg.unanswered],
            ] as [ReviewFilter, string, number][]
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={reviewFilter === key}
              className={`${styles.tab} ${reviewFilter === key ? `${styles.tabActive} ${styles[`tabActive${capitalize(key)}`] ?? ''}` : ''}`}
              onClick={() => setReviewFilter(key)}
            >
              {label} <span className={styles.tabCount}>{count}</span>
            </button>
          ))}
        </div>
        {filteredQuestions.length === 0 ? (
          <EmptyState illustration="exam" compact title="No questions in this category." />
        ) : (
          <ol className={styles.reviewList}>
            {filteredQuestions.map((question) => (
              <li key={question.id} className={styles.reviewCard}>
                <div className={styles.questionMeta}>
                  <span className={styles.domainTag}>{question.domain}</span>
                  <span className={styles.difficultyTag} data-difficulty={question.difficulty}>{question.difficulty}</span>
                  <span
                    className={
                      question.selectedAnswer === null
                        ? styles.verdictNeutral
                        : question.isCorrect
                          ? styles.verdictRight
                          : styles.verdictWrong
                    }
                  >
                    {question.selectedAnswer === null ? 'Unattempted' : question.isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                <p className={styles.questionText}>
                  {question.displayNumber}. {question.question}
                </p>
                <ul className={styles.optionList}>
                  {Object.entries(question.options).map(([key, text]) => {
                    const isSelected = question.selectedAnswer?.includes(key) ?? false;
                    const isCorrectKey = question.correctAnswer.includes(key);
                    const cls = isCorrectKey
                      ? `${styles.optionRow} ${styles.optionCorrect}`
                      : isSelected
                        ? `${styles.optionRow} ${styles.optionWrong}`
                        : styles.optionRow;
                    return (
                      <li key={key} className={cls}>
                        <span className={styles.optionKey}>{key}.</span> {text}
                      </li>
                    );
                  })}
                </ul>
                {question.explanation && <p className={styles.explanation}>{question.explanation}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  if (phase === 'active' && active) {
    const question = active.questions[currentIndex];
    const answeredCount = active.questions.filter((q) => (selections[q.id]?.length ?? 0) > 0).length;
    const lowTime = remainingSeconds <= 300;

    // Exam mode takes over the whole viewport via a body-level overlay —
    // the sidebar and page chrome stay behind it so nothing competes for
    // attention while the clock runs.
    return createPortal(
      <div className={styles.examOverlay} role="dialog" aria-modal="true" aria-label={`${exam.title} — exam mode`}>
        <div className={styles.runner}>
        <div className={styles.activeHeader}>
          <div>
            <h1 className={styles.examTitle}>{exam.title}</h1>
            <p className={styles.progressText}>
              Question {currentIndex + 1} of {active.questions.length} · {answeredCount} answered
            </p>
          </div>
            <div className={styles.headerControls}>
              <div className={`${styles.timerBox} ${lowTime ? styles.timerLow : ''}`} aria-live="polite">
                <TimerIcon className={styles.controlIcon} />
                <span>{formatClock(remainingSeconds)}</span>
              </div>
            {confirmingExit ? (
              <span className={styles.confirmCluster}>
                <span className={styles.confirmText}>Abandon this attempt?</span>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => {
                    setPhase('idle');
                    setError(null);
                  }}
                  disabled={submitting}
                >
                  Yes, exit
                </button>
                <button type="button" className={`${styles.secondaryButton} ${styles.keepWorkingButton}`} onClick={() => setConfirmingExit(false)} disabled={submitting}>
                  Keep working
                </button>
              </span>
            ) : (
              <button type="button" className={styles.exitButton} onClick={() => setConfirmingExit(true)} disabled={submitting}>
                <LogoutMenuIcon className={styles.controlIcon} />
                <span>Exit exam</span>
              </button>
            )}
          </div>
        </div>

        <nav className={styles.paletteGrid} aria-label="Exam questions">
          {active.questions.map((q, index) => {
            const answered = (selections[q.id]?.length ?? 0) > 0;
            // Current wins the fill color (CSS cascade), answered still rides
            // along so stepping off the question reveals its marked state.
            const cls = [
              styles.paletteItem,
              answered && styles.paletteItemAnswered,
              index === currentIndex && styles.paletteItemCurrent,
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button key={q.id} type="button" className={cls} onClick={() => setCurrentIndex(index)}>
                {index + 1}
              </button>
            );
          })}
        </nav>

        {question && (
          <div className={styles.questionCard}>
            <div className={styles.questionMeta}>
              <span className={styles.domainTag}>{question.domain}</span>
              <span className={styles.difficultyTag} data-difficulty={question.difficulty}>{question.difficulty}</span>
            </div>
            <p className={styles.questionText}>{question.question}</p>
            <ul className={styles.optionList}>
              {Object.entries(question.options).map(([key, text]) => {
                const selected = selections[question.id]?.includes(key) ?? false;
                return (
                  <li key={key}>
                    <label className={`${styles.optionRow} ${selected ? styles.optionSelected : ''}`}>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        checked={selected}
                        onChange={() =>
                          setSelections((prev) => ({
                            ...prev,
                            [question.id]: [key], // single-answer MCQs today
                          }))
                        }
                      />
                      <span>
                        <span className={styles.optionKey}>{key}.</span> {text}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className={styles.navRow}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0 || submitting}
          >
            ← Previous
          </button>
          {currentIndex < active.questions.length - 1 ? (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setCurrentIndex((i) => Math.min(active.questions.length - 1, i + 1))}
              disabled={submitting}
            >
              Next →
            </button>
          ) : confirmingSubmit ? (
            <span className={styles.confirmCluster}>
              <span className={styles.confirmText}>Submit for scoring?</span>
              <button type="button" className={styles.dangerButton} onClick={() => void submitRef.current(active.attemptId)} disabled={submitting}>
                Yes, submit
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => setConfirmingSubmit(false)} disabled={submitting}>
                Keep working
              </button>
            </span>
          ) : (
            <button type="button" className={styles.dangerButton} onClick={() => setConfirmingSubmit(true)} disabled={submitting}>
              Submit exam
            </button>
          )}
        </div>

        {submitting && <p className={styles.busyText}>Scoring your answers…</p>}
        {!submitting && error && <p className={styles.errorText}>{error}</p>}
        </div>
      </div>,
      document.body,
    );
  }

  // idle
  return (
    <div className={styles.runner}>
      <div className={styles.examHeaderRow}>
        {exam.logoUrl ? (
          <span className={styles.examLogo}>
            <Image src={exam.logoUrl} alt="" width={32} height={32} unoptimized />
          </span>
        ) : (
          <span className={styles.examLogoFallback} aria-hidden="true">
            {exam.examCode.slice(0, 2).toUpperCase()}
          </span>
        )}
        <h1 className={styles.examTitle}>{exam.title}</h1>
      </div>
      <div className={styles.rulesCard}>
        <h2 className={styles.sectionHeading}>How this works</h2>
        <ul className={styles.ruleList}>
          <li>
            You get <strong>{exam.durationMinutes} minutes</strong> for{' '}
            <strong>{exam.liveQuestionCount} questions</strong>, drawn randomly from the full bank.
          </li>
          <li>
            Question mix follows the bank: {exam.easyCount} easy, {exam.mediumCount} medium, {exam.hardCount} hard
            questions are available.
          </li>
          <li>The timer starts as soon as you press Start and cannot be paused.</li>
          <li>Refreshing or closing the tab abandons the attempt — exams never resume mid-way.</li>
          <li>Your score and full answer review appear only after you submit.</li>
          <li>Retake it as many times as you like — every attempt draws a fresh random question set.</li>
        </ul>
        <div className={styles.startRow}>
          <button type="button" className={styles.primaryButton} onClick={() => void startExam()} disabled={starting}>
            {starting ? 'Preparing your exam…' : 'Start exam'}
          </button>
        </div>
        {error && <p className={styles.errorText}>{error}</p>}
      </div>
    </div>
  );
}

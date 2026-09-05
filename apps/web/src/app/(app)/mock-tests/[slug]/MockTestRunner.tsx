'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { startMockAttempt, submitMockAttempt, type MockExamSummary, type MockTestQuestionView, type MockTestResultResponse } from '@/data/mockTests';
import { LogoutMenuIcon, TimerIcon } from '@/components/icons/ActionIcons';
import styles from './styles.module.css';

type Phase = 'idle' | 'active' | 'results';

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

// One stacked segment list shared by the composition and difficulty bars —
// zero-count series drop out so the 2px surface gaps stay meaningful.
function stackedSegments(row: { correct: number; wrong: number; unanswered: number }): { key: string; count: number }[] {
  return [
    { key: 'correct', count: row.correct },
    { key: 'wrong', count: row.wrong },
    { key: 'unanswered', count: row.unanswered },
  ].filter((segment) => segment.count > 0);
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
        setError(startError ?? 'Could not start the mock test.');
        return;
      }
      autoSubmittedRef.current = false;
      setSelections({});
      setCurrentIndex(0);
      setConfirmingExit(false);
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
    const timeTakenMin = (() => {
      const ms = new Date(result.submittedAt).getTime() - new Date(result.startedAt).getTime();
      return Number.isFinite(ms) && ms > 0 ? Math.max(1, Math.round(ms / 60000)) : null;
    })();
    const orderedQuestions = [...result.questions].sort(
      (a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 9) - (DIFFICULTY_ORDER[b.difficulty] ?? 9),
    );
    return (
      <div className={styles.runner}>
        <div className={styles.scoreCard}>
          <p className={styles.scoreLabel}>Your score</p>
          <p className={`${styles.scoreValue} ${passed ? styles.scoreGood : styles.scoreLow}`}>
            {result.score}%
          </p>
          <p className={styles.scoreDetail}>
            {result.correctCount} of {result.totalQuestions} correct · {result.examTitle}
          </p>
        </div>

        <div className={styles.tileRow}>
          <div className={styles.statTile}>
            <span className={styles.tileValue}>{agg.correct}</span>
            <span className={styles.tileLabel}>
              <span className={`${styles.swatch} ${styles.swatchCorrect}`} /> Correct
            </span>
          </div>
          <div className={styles.statTile}>
            <span className={styles.tileValue}>{agg.wrong}</span>
            <span className={styles.tileLabel}>
              <span className={`${styles.swatch} ${styles.swatchWrong}`} /> Wrong
            </span>
          </div>
          <div className={styles.statTile}>
            <span className={styles.tileValue}>{agg.unanswered}</span>
            <span className={styles.tileLabel}>
              <span className={`${styles.swatch} ${styles.swatchUnanswered}`} /> Unanswered
            </span>
          </div>
          <div className={styles.statTile}>
            <span className={styles.tileValue}>{timeTakenMin !== null ? `${timeTakenMin} min` : '—'}</span>
            <span className={styles.tileLabelPlain}>Time taken</span>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.sectionHeading}>Score composition</h2>
          <div
            className={styles.stackBar}
            role="img"
            aria-label={`Correct ${agg.correct}, wrong ${agg.wrong}, unanswered ${agg.unanswered} of ${result.totalQuestions}`}
          >
            {stackedSegments(agg).map((segment, index, all) => (
              <div
                key={segment.key}
                className={`${styles.segment} ${styles[`seg${segment.key.charAt(0).toUpperCase()}${segment.key.slice(1)}`]}`}
                style={{
                  width: `${(segment.count / result.totalQuestions) * 100}%`,
                  ...(index === all.length - 1 ? { borderRadius: '0 4px 4px 0' } : {}),
                }}
                title={`${segment.key}: ${segment.count}`}
              />
            ))}
          </div>
          <div className={styles.legendRow}>
            <span className={styles.legendItem}>
              <span className={`${styles.swatch} ${styles.swatchCorrect}`} /> Correct ({agg.correct})
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.swatch} ${styles.swatchWrong}`} /> Wrong ({agg.wrong})
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.swatch} ${styles.swatchUnanswered}`} /> Unanswered ({agg.unanswered})
            </span>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h2 className={styles.sectionHeading}>Performance by difficulty</h2>
          <div className={styles.rowChartList}>
            {agg.byDifficulty.map((row) => {
              const segments = stackedSegments(row);
              return (
                <div key={row.difficulty} className={styles.rowChart}>
                  <span className={styles.rowLabel}>{row.difficulty}</span>
                  <div
                    className={styles.stackBar}
                    role="img"
                    aria-label={`${row.difficulty}: ${row.correct} correct, ${row.wrong} wrong, ${row.unanswered} unanswered`}
                  >
                    {segments.map((segment, index, all) => (
                      <div
                        key={segment.key}
                        className={`${styles.segment} ${styles[`seg${segment.key.charAt(0).toUpperCase()}${segment.key.slice(1)}`]}`}
                        style={{
                          width: `${(segment.count / row.total) * 100}%`,
                          ...(index === all.length - 1 ? { borderRadius: '0 4px 4px 0' } : {}),
                        }}
                        title={`${segment.key}: ${segment.count}`}
                      />
                    ))}
                  </div>
                  <span className={styles.rowValue}>
                    {Math.round((row.correct / row.total) * 100)}% · {row.total} Qs
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {agg.byDomain.length > 0 && (
          <div className={styles.chartCard}>
            <h2 className={styles.sectionHeading}>Performance by domain</h2>
            <div className={styles.rowChartList}>
              {agg.byDomain.map((row) => (
                <div key={row.domain} className={styles.rowChart} title={`${row.domain}: ${row.correct}/${row.total}`}>
                  <span className={styles.rowLabel} title={row.domain}>
                    {row.domain}
                  </span>
                  <div className={styles.trackBar} role="img" aria-label={`${row.domain}: ${row.percent}% correct`}>
                    <div className={styles.fillBar} style={{ width: `${row.percent}%` }} />
                  </div>
                  <span className={styles.rowValue}>{row.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className={styles.sectionHeading}>Review</h2>
        <ol className={styles.reviewList}>
          {orderedQuestions.map((question, index) => (
            <li key={question.id} className={styles.reviewCard}>
              <div className={styles.questionMeta}>
                <span className={styles.domainTag}>{question.domain}</span>
                <span className={styles.difficultyTag}>{question.difficulty}</span>
                <span className={question.isCorrect ? styles.verdictRight : styles.verdictWrong}>
                  {question.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              <p className={styles.questionText}>
                {index + 1}. {question.question}
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

        <div className={styles.resultsActions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => {
              clearCachedResult();
              setResult(null);
              setPhase('idle');
            }}
          >
            Retake this test
          </button>
          <Link href="/mock-tests" className={styles.secondaryLink} onClick={clearCachedResult}>
            Back to all mock tests
          </Link>
        </div>
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
                <span>Exit test</span>
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
              <span className={styles.difficultyTag}>{question.difficulty}</span>
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
              Submit test
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
      <h1 className={styles.examTitle}>{exam.title}</h1>
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
          <li>Refreshing or closing the tab abandons the attempt — tests never resume mid-way.</li>
          <li>Your score and full answer review appear only after you submit.</li>
          <li>Retake it as many times as you like — every attempt draws a fresh random question set.</li>
        </ul>
        <div className={styles.startRow}>
          <button type="button" className={styles.primaryButton} onClick={() => void startExam()} disabled={starting}>
            {starting ? 'Preparing your test…' : 'Start test'}
          </button>
        </div>
        {error && <p className={styles.errorText}>{error}</p>}
      </div>
    </div>
  );
}

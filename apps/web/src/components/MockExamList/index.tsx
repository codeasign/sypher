'use client';

import Link from 'next/link';
import Image from 'next/image';
import { fetchMockExamPage, type MockExamSummary } from '@/data/mockTests';
import { usePaginatedListView } from '@/hooks/usePaginatedListView';
import { ListViewToolbar } from '@/components/ListViewToolbar';
import Pagination from '@/components/Pagination';
import { OpenInNewIcon, ChevronRightIcon } from '@/components/icons/ActionIcons';
import styles from './styles.module.css';

// Fixed display order for the /mock-tests role sections — matches the
// role labels backfilled onto MockExam (2026-09-05). A role outside this
// list (a future certification wave that hasn't been slotted in yet)
// falls into a trailing "Other" bucket rather than being dropped.
const ROLE_ORDER = ['AI Practitioner', 'AI Quality Engineer', 'Test Automation Engineer', 'Performance Tester', 'Security Tester'];
const OTHER_ROLE = 'Other';

// Each certifying body's own real brand color, pulled straight from the
// downloaded vendor logo SVGs (apps/web/public/mock-exam-logos/) rather
// than guessed: AWS's "Smile" orange (aws.svg's .st1 fill), Microsoft's
// primary Azure blue (the flat #0078d4 path in azure.svg, not one of the
// gradient stops), ISTQB's navy (istqb.svg's .cls-2 fill, the dominant
// color across their own site chrome). Keyed by logoUrl so it falls out
// of data that's already there — no separate DB column for something
// fully derivable from the 3 known logos (2026-09-05).
const BRAND_COLOR_BY_LOGO: Record<string, string> = {
  '/mock-exam-logos/aws.svg': '#FF9900',
  '/mock-exam-logos/azure.svg': '#0078D4',
  '/mock-exam-logos/istqb.svg': '#003764',
};
const DEFAULT_CARD_ACCENT = 'var(--ifm-color-emphasis-400)';

function brandColorFor(logoUrl: string | null): string {
  return (logoUrl && BRAND_COLOR_BY_LOGO[logoUrl]) || DEFAULT_CARD_ACCENT;
}

// Guards every place officialLink becomes an <a href> (three across this
// file). Today the field is only ever set by hand via a verified SQL
// backfill (never invented, never user-submitted — see MockExam.officialLink
// in schema.prisma), so there's no live path for a javascript: URI to land
// here — but that stops being true the moment this field gets an admin
// edit surface, and validating the scheme costs nothing now. Flagged by
// automated security review 2026-09-05; no window reference so this also
// runs safely during SSR (this is a client component, but still renders
// server-side first).
function safeCertLink(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function groupByRole(exams: MockExamSummary[]): { role: string; exams: MockExamSummary[] }[] {
  const byRole = new Map<string, MockExamSummary[]>();
  for (const exam of exams) {
    const role = exam.role ?? OTHER_ROLE;
    const bucket = byRole.get(role);
    if (bucket) bucket.push(exam);
    else byRole.set(role, [exam]);
  }
  const order = [...ROLE_ORDER, ...[...byRole.keys()].filter((r) => r !== OTHER_ROLE && !ROLE_ORDER.includes(r)).sort(), OTHER_ROLE];
  return order
    .filter((role) => byRole.has(role))
    .map((role) => ({ role, exams: byRole.get(role)!.sort((a, b) => a.title.localeCompare(b.title)) }));
}

// Page-based navigation (Previous/Next + page numbers) fetches exactly
// one page from the API — same pattern as BlogList/CourseListView.
export default function MockExamList({
  initialExams,
  total,
  pageSize,
}: {
  initialExams: MockExamSummary[];
  total: number;
  pageSize: number;
}) {
  const { items: exams, total: liveTotal, page, totalPages, loading, loadError, goToPage, viewMode, setViewMode } = usePaginatedListView({
    initialItems: initialExams,
    total,
    pageSize,
    storageKey: 'mock-tests-view-mode',
    defaultView: 'card',
    fetchPage: async (limit, offset) => {
      const page = await fetchMockExamPage(limit, offset);
      return { items: page.exams, total: page.total };
    },
  });

  if (liveTotal === 0) {
    return <p className={styles.emptyText}>No mock tests available yet — check back soon.</p>;
  }

  const groups = groupByRole(exams);

  return (
    <>
      <ListViewToolbar
        shown={exams.length}
        total={liveTotal}
        itemLabelSingular="mock test"
        itemLabelPlural="mock tests"
        viewMode={viewMode}
        onChangeView={setViewMode}
        ariaLabel="Mock test display"
        showCount={false}
      />

      {groups.map((group) => (
        <section key={group.role} className={styles.roleSection}>
          <h2 className={styles.roleHeading}>{group.role}</h2>

          {viewMode === 'card' ? (
            <div className={styles.grid}>
              {group.exams.map((exam) => {
                const officialLink = safeCertLink(exam.officialLink);
                return (
                  <div
                    key={exam.id}
                    className={styles.card}
                    style={{ '--card-accent': brandColorFor(exam.logoUrl) } as React.CSSProperties}
                  >
                    <div className={styles.cardTop}>
                      {exam.logoUrl ? (
                        <span className={styles.cardLogo}>
                          <Image src={exam.logoUrl} alt="" width={28} height={28} unoptimized />
                        </span>
                      ) : (
                        <span className={styles.cardLogoFallback} aria-hidden="true">
                          {exam.examCode.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      {officialLink ? (
                        <a
                          href={officialLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.examCode}
                          title={`Official certification page for ${exam.title}`}
                        >
                          {exam.examCode}
                        </a>
                      ) : (
                        <span className={styles.examCode}>{exam.examCode}</span>
                      )}
                    </div>
                    <div className={styles.cardMain}>
                      <h3 className={styles.cardTitle}>{exam.title}</h3>
                      <div className={styles.metaRow}>
                        <span className={`${styles.chip} ${styles.chipDuration}`}>{exam.durationMinutes} min</span>
                        <span className={`${styles.chip} ${styles.chipQuestions}`}>{exam.liveQuestionCount} questions</span>
                        {exam.priceUsd !== null && (
                          <span className={`${styles.chip} ${styles.chipPrice}`}>${exam.priceUsd} to certify</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      {officialLink && (
                        <a
                          href={officialLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${styles.cardActionBtn} ${styles.cardActionNeutral}`}
                        >
                          Official Site
                          <OpenInNewIcon className={styles.cardActionIcon} />
                        </a>
                      )}
                      <Link href={`/mock-tests/${exam.slug}`} className={`${styles.cardActionBtn} ${styles.cardActionPrimary}`}>
                        Start Test
                        <ChevronRightIcon className={styles.cardActionIcon} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.rowList}>
              {group.exams.map((exam) => {
                const officialLink = safeCertLink(exam.officialLink);
                return (
                  <div key={exam.id} className={styles.row}>
                    {exam.logoUrl ? (
                      <span className={styles.rowLogo}>
                        <Image src={exam.logoUrl} alt="" width={22} height={22} unoptimized />
                      </span>
                    ) : (
                      <span className={styles.rowLogoFallback} aria-hidden="true">
                        {exam.examCode.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className={styles.rowBody}>
                      <div className={styles.rowTop}>
                        {officialLink ? (
                          <a
                            href={officialLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.examCode}
                            title={`Official certification page for ${exam.title}`}
                          >
                            {exam.examCode}
                          </a>
                        ) : (
                          <span className={styles.examCode}>{exam.examCode}</span>
                        )}
                        <h3 className={styles.rowTitle}>{exam.title}</h3>
                      </div>
                      <div className={styles.metaRow}>
                        <span className={`${styles.chip} ${styles.chipDuration}`}>{exam.durationMinutes} min</span>
                        <span className={`${styles.chip} ${styles.chipQuestions}`}>{exam.liveQuestionCount} questions</span>
                        {exam.priceUsd !== null && (
                          <span className={`${styles.chip} ${styles.chipPrice}`}>${exam.priceUsd} to certify</span>
                        )}
                      </div>
                    </div>
                    {/* Same two buttons, same classes, as the card view — the
                        row's own "Start →" link + a tiny icon-only official
                        link button read as different information than the
                        card, which the 2026-09-06 consistency rule rules out. */}
                    <div className={styles.rowActions}>
                      {officialLink && (
                        <a
                          href={officialLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${styles.cardActionBtn} ${styles.cardActionNeutral}`}
                        >
                          Official Site
                          <OpenInNewIcon className={styles.cardActionIcon} />
                        </a>
                      )}
                      <Link href={`/mock-tests/${exam.slug}`} className={`${styles.cardActionBtn} ${styles.cardActionPrimary}`}>
                        Start Test
                        <ChevronRightIcon className={styles.cardActionIcon} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}

      {loadError && <p className={styles.loadErrorText}>{loadError}</p>}
      <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} disabled={loading} />
    </>
  );
}

"use client";

import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUpgradeToPaid } from "@/hooks/useUpgradeToPaid";
import MiniBars from "@/components/charts/MiniBars";
import TrendArea from "@/components/charts/TrendArea";
import ProgressRing from "@/components/charts/ProgressRing";
import CourseCard from "@/components/CourseCard";
import { accentFor, categoryAccent } from "@/lib/palette";
import type { UserDashboard } from "@/data/dashboard";
import styles from "./styles.module.css";

// Chart colours — deliberately off the dominant primary so the page reads
// as multi-hue: teal for activity, blue for exam scores, green for
// completion.
const ACTIVITY_ACCENT = "#0ea5a4";
const EXAM_ACCENT = "#3b82f6";
const COMPLETION_ACCENT = "#22c55e";
// Text-safe palette (readable on both the light and near-black card bg) —
// one per stat tile / community stat, fixed order.
const TILE_ACCENTS = [
    "#2563eb",
    "#0d9488",
    "#16a34a",
    "#b45309",
    "#7c3aed",
    "#db2777",
];
const COMMUNITY_ACCENTS = ["#7c3aed", "#16a34a", "#db2777", "#b45309"];

interface CompletedCourseEntry {
    course: {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        coverImageUrl: string | null;
    };
    completedAt: string;
}

interface Props {
    data: UserDashboard;
    userEmail: string;
    fullName: string | null;
    completions: CompletedCourseEntry[];
}

const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

// Deterministic (UTC) formatters — this is a client component fed a
// server-fetched payload, so locale/timezone-sensitive Intl calls would
// risk a hydration mismatch.
function fmtDate(iso: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function fmtNum(n: number): string {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
function weekTick(weekStart: string): string {
    const d = new Date(weekStart);
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export default function DashboardHome({
    data,
    userEmail,
    fullName,
    completions,
}: Props): React.JSX.Element {
    const router = useRouter();
    const { handleUpgrade, isProcessing, errorMessage } = useUpgradeToPaid(
        userEmail,
        () => router.refresh(),
        'dashboard_home',
    );
    const firstName =
        (fullName?.trim().split(/\s+/)[0] || userEmail.split("@")[0]) ??
        "there";

    const {
        plan,
        access,
        learning,
        exams,
        community,
        blogActivity,
        activity,
        categories,
        continueLearning,
        recommended,
        platform,
        upgrade,
    } = data;

    const completionPct =
        learning.accessibleModules > 0
            ? Math.round(
                  (learning.modulesCompletedInAccessible /
                      learning.accessibleModules) *
                      100,
              )
            : 0;

    const tiles: {
        value: string;
        label: string;
        hint?: string;
        accent?: string;
    }[] = [
        {
            value: fmtNum(learning.modulesCompleted),
            label: "Lessons completed",
        },
        {
            value: fmtNum(learning.coursesInProgress),
            label: "Courses in progress",
        },
        {
            value: fmtNum(learning.coursesCompleted),
            label: "Courses completed",
        },
        {
            value: `${learning.currentStreakDays}`,
            label: "Day streak",
            hint: `Best ${learning.longestStreakDays}`,
        },
        {
            value: exams.bestScore === null ? "—" : `${exams.bestScore}%`,
            label: "Best exam score",
            hint: exams.completedAttempts
                ? `${exams.completedAttempts} taken`
                : undefined,
        },
        { value: fmtNum(community.upvotesReceived), label: "Upvotes received" },
    ].map((t, i) => ({ ...t, accent: TILE_ACCENTS[i % TILE_ACCENTS.length] }));
    const recentExamAttempts = [...exams.trend].reverse().slice(0, 5);

    return (
        <div className={styles.root}>
            <header className={styles.header}>
                <div>
                    <h2 className={styles.title}>
                        Welcome back, {fullName || userEmail.split("@")[0]}
                    </h2>
                    <p className={styles.sub}>
                        Member since {fmtDate(plan.memberSince)}
                        {learning.activeDays > 0 &&
                            ` · ${learning.activeDays} active ${learning.activeDays === 1 ? "day" : "days"} of learning`}
                    </p>
                </div>
            </header>

            {/* ── Conversion band ───────────────────────────────────────────── */}
            {upgrade.show ? (
                <section className={`${styles.band} ${styles.bandUpgrade}`}>
                    <div className={styles.bandMain}>
                        <span className={styles.bandKicker}>
                            Unlock the full library
                        </span>
                        <h2 className={styles.bandTitle}>
                            Open {fmtNum(upgrade.lockedCourses)} more{" "}
                            {upgrade.lockedCourses === 1 ? "course" : "courses"}{" "}
                            and {fmtNum(upgrade.lockedModules)} lessons
                        </h2>
                        <p className={styles.bandText}>
                            You can fully take {access.accessibleCourses} of{" "}
                            {access.totalCourses} courses today. Pro opens
                            everything — every course, every certification
                            practice exam.
                        </p>
                        {upgrade.highlightedLockedCourses.length > 0 && (
                            <div className={styles.bandChips}>
                                {upgrade.highlightedLockedCourses.map((c) => (
                                    <Link
                                        key={c.slug}
                                        href={`/learn/${c.slug}`}
                                        className={styles.bandChip}
                                    >
                                        {c.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                        <div className={styles.bandActions}>
                            <button
                                type="button"
                                className={styles.ctaButton}
                                disabled={isProcessing}
                                onClick={() => void handleUpgrade()}
                            >
                                {isProcessing ? "Processing…" : "Go Pro"}
                            </button>
                            <span className={styles.bandProof}>
                                Join {fmtNum(platform.learners)} learners ·{" "}
                                {platform.courses} courses ·{" "}
                                {fmtNum(platform.modules)} lessons ·{" "}
                                {platform.mockExams} certification practice
                                exams
                            </span>
                        </div>
                        {errorMessage && (
                            <p className={styles.bandError}>{errorMessage}</p>
                        )}
                    </div>
                    <div className={styles.bandAside}>
                        <ProgressRing
                            percent={access.accessiblePercent}
                            caption="unlocked"
                            ariaLabel={`${access.accessiblePercent}% of the catalog unlocked`}
                        />
                        <span className={styles.bandAsideText}>
                            {access.accessibleCourses}/{access.totalCourses}{" "}
                            courses
                        </span>
                    </div>
                </section>
            ) : (
                <section className={`${styles.band} ${styles.bandNeutral}`}>
                    <div className={styles.bandMain}>
                        <span className={styles.bandKicker}>
                            {plan.isPaidActive
                                ? "Pro membership active"
                                : "Full access"}
                        </span>
                        <h2 className={styles.bandTitle}>
                            {completionPct}% of your unlocked material complete
                        </h2>
                        <p className={styles.bandText}>
                            {learning.modulesCompletedInAccessible} of{" "}
                            {learning.accessibleModules} lessons done across{" "}
                            {access.accessibleCourses} courses.
                            {plan.isPaidActive &&
                                plan.daysRemaining !== null &&
                                ` Your Pro plan renews in ${plan.daysRemaining} days.`}
                        </p>
                        <div className={styles.bandActions}>
                            <Link
                                href="/browse-courses"
                                className={styles.ctaButton}
                            >
                                Browse courses
                            </Link>
                            <span className={styles.bandProof}>
                                {platform.courses} courses ·{" "}
                                {fmtNum(platform.modules)} lessons ·{" "}
                                {platform.mockExams} certification practice
                                exams
                            </span>
                        </div>
                    </div>
                    <div className={styles.bandAside}>
                        <ProgressRing
                            percent={completionPct}
                            caption="complete"
                            ariaLabel={`${completionPct}% complete`}
                            accent={COMPLETION_ACCENT}
                        />
                    </div>
                </section>
            )}

            {/* ── Stat tiles ────────────────────────────────────────────────── */}
            <section
                className={styles.overview}
                aria-labelledby="learning-overview-title"
            >
                <div className={styles.sectionHead}>
                    <div>
                        <span className={styles.sectionKicker}>
                            Your progress
                        </span>
                        <h2
                            id="learning-overview-title"
                            className={styles.sectionTitle}
                        >
                            Learning overview
                        </h2>
                    </div>
                    <span className={styles.sectionMeta}>
                        {learning.activeDays} active learning days
                    </span>
                </div>
                <div className={styles.tiles}>
                    {tiles.map((t) => (
                        <div
                            key={t.label}
                            className={styles.tile}
                            style={
                                t.accent
                                    ? ({
                                          "--tile-accent": t.accent,
                                      } as React.CSSProperties)
                                    : undefined
                            }
                        >
                            <span className={styles.tileValue}>{t.value}</span>
                            <span className={styles.tileLabel}>{t.label}</span>
                            {t.hint && (
                                <span className={styles.tileHint}>
                                    {t.hint}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Charts ────────────────────────────────────────────────────── */}
            <section className={styles.charts}>
                <article className={`${styles.card} ${styles.activityCard}`}>
                    <div className={styles.cardHead}>
                        <h3 className={styles.cardTitle}>Lessons completed</h3>
                        <span className={styles.cardSub}>Last 12 weeks</span>
                    </div>
                    <div className={styles.chartSurface}>
                        <MiniBars
                            data={activity.weekly.map((w) => ({
                                label: weekTick(w.weekStart),
                                value: w.modules,
                            }))}
                            ariaLabel="Lessons completed per week over the last 12 weeks"
                            labelEvery={3}
                            accent={ACTIVITY_ACCENT}
                        />
                    </div>
                </article>

                <article className={`${styles.card} ${styles.blogCard}`}>
                    <div className={styles.cardHead}>
                        <div>
                            <span className={styles.cardKicker}>
                                Your conversations
                            </span>
                            <h3 className={styles.cardTitle}>Blog activity</h3>
                        </div>
                        <Link href="/blog" className={styles.cardHeadLink}>
                            Visit blog
                        </Link>
                    </div>
                    <div className={styles.blogStats}>
                        <div>
                            <span className={styles.blogStatValue}>
                                {blogActivity.publishedPosts}
                            </span>
                            <span className={styles.blogStatLabel}>
                                Blog posts
                            </span>
                        </div>
                        <div>
                            <span className={styles.blogStatValue}>
                                {blogActivity.comments}
                            </span>
                            <span className={styles.blogStatLabel}>
                                Comments
                            </span>
                        </div>
                        <div>
                            <span className={styles.blogStatValue}>
                                {blogActivity.postsDiscussed}
                            </span>
                            <span className={styles.blogStatLabel}>
                                Posts discussed
                            </span>
                        </div>
                        <div>
                            <span className={styles.blogStatValue}>
                                {blogActivity.recognitionReceived}
                            </span>
                            <span className={styles.blogStatLabel}>
                                Recognition
                            </span>
                        </div>
                    </div>
                    {blogActivity.recent.length > 0 ? (
                        <ul className={styles.blogRecentList}>
                            {blogActivity.recent.map((item, index) => (
                                <li key={`${item.slug}-${item.date}-${index}`}>
                                    <Link
                                        href={`/blog/${item.slug}`}
                                        className={styles.blogRecentLink}
                                    >
                                        <span
                                            className={styles.blogRecentTitle}
                                        >
                                            {item.title}
                                        </span>
                                        <span className={styles.blogRecentDate}>
                                            {fmtDate(item.date)}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className={styles.blogEmpty}>
                            <p>
                                Join a blog discussion and your activity will
                                appear here.
                            </p>
                            <Link
                                href="/blog"
                                className={styles.chartEmptyLink}
                            >
                                Explore articles
                            </Link>
                        </div>
                    )}
                </article>

                <article className={`${styles.card} ${styles.examCard}`}>
                    <div className={styles.cardHead}>
                        <div>
                            <span className={styles.cardKicker}>
                                Certification practice
                            </span>
                            <h3 className={styles.cardTitle}>
                                Exam performance
                            </h3>
                        </div>
                        <Link
                            href="/mock-tests"
                            className={styles.cardHeadLink}
                        >
                            View exams
                        </Link>
                    </div>
                    <div className={styles.examStats}>
                        <div>
                            <span className={styles.examStatValue}>
                                {exams.bestScore === null
                                    ? "—"
                                    : `${exams.bestScore}%`}
                            </span>
                            <span className={styles.examStatLabel}>
                                Best score
                            </span>
                        </div>
                        <div>
                            <span className={styles.examStatValue}>
                                {exams.averageScore === null
                                    ? "—"
                                    : `${exams.averageScore}%`}
                            </span>
                            <span className={styles.examStatLabel}>
                                Average
                            </span>
                        </div>
                        <div>
                            <span className={styles.examStatValue}>
                                {exams.completedAttempts}
                            </span>
                            <span className={styles.examStatLabel}>
                                Completed
                            </span>
                        </div>
                    </div>
                    <div className={styles.examBody}>
                        <div className={styles.examTrend}>
                            <span className={styles.panelLabel}>
                                Score trend
                            </span>
                            {exams.trend.length >= 2 ? (
                                <div className={styles.chartSurface}>
                                    <TrendArea
                                        points={exams.trend.map((p) => ({
                                            label: p.label,
                                            value: p.score,
                                        }))}
                                        ariaLabel="Certification practice exam score trend"
                                        accent={EXAM_ACCENT}
                                    />
                                </div>
                            ) : (
                                <div className={styles.chartEmpty}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "28px",
                                            padding: "18px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "48px",
                                                height: "48px",
                                                borderRadius: "50%",
                                                background: "#EFF6FF",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <ClipboardCheck
                                                size={24}
                                                color={EXAM_ACCENT}
                                            />
                                        </div>
                                        <div style={{ textAlign: "left" }}>
                                            <h4
                                                style={{
                                                    margin: 0,
                                                    fontSize: "18px",
                                                    fontWeight: 600,
                                                    color: "#3c4148",
                                                }}
                                            >
                                                No practice exams available
                                                yet.
                                            </h4>

                                            <p
                                                style={{
                                                    marginTop: "10px",
                                                    marginBottom: 0,
                                                    fontSize: "16px",
                                                    lineHeight: 1.5,
                                                    color: "#6B7280",
                                                }}
                                            >
                                                Test your skills with a
                                                timed certification practice
                                                exam and track your
                                                progress.
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/mock-tests"
                                        className={styles.chartEmptyLink}
                                    >
                                        Start an exam
                                    </Link>
                                </div>
                            )}
                        </div>
                        <div className={styles.examHistory}>
                            <span className={styles.panelLabel}>
                                Recent attempts
                            </span>
                            {recentExamAttempts.length > 0 ? (
                                <ol className={styles.attemptList}>
                                    {recentExamAttempts.map(
                                        (attempt, index) => (
                                            <li
                                                key={`${attempt.label}-${attempt.date}-${index}`}
                                                className={styles.attemptRow}
                                            >
                                                <Link
                                                    href={`/mock-tests/${attempt.slug}`}
                                                    className={
                                                        styles.attemptLink
                                                    }
                                                >
                                                    <span
                                                        className={
                                                            styles.attemptMarker
                                                        }
                                                        aria-hidden
                                                    />
                                                    <span
                                                        className={
                                                            styles.attemptInfo
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                styles.attemptTitle
                                                            }
                                                        >
                                                            {attempt.title}
                                                        </span>
                                                        <span
                                                            className={
                                                                styles.attemptDate
                                                            }
                                                        >
                                                            {attempt.label} ·{" "}
                                                            {fmtDate(
                                                                attempt.date,
                                                            )}
                                                        </span>
                                                    </span>
                                                    <span
                                                        className={
                                                            styles.attemptScore
                                                        }
                                                    >
                                                        {attempt.score}%
                                                    </span>
                                                </Link>
                                            </li>
                                        ),
                                    )}
                                </ol>
                            ) : (
                                <div className={styles.historyEmpty}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "28px",
                                            padding: "20px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "48px",
                                                height: "48px",
                                                borderRadius: "50%",
                                                background: "#EFF6FF",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <ClipboardCheck
                                                size={24}
                                                color={EXAM_ACCENT}
                                            />
                                        </div>
                                        <div style={{ textAlign: "left" }}>
                                            <h3
                                                style={{
                                                    margin: 0,
                                                    fontSize: "18px",
                                                    fontWeight: 600,
                                                    color: "#374151",
                                                }}
                                            >
                                                No completed attempts yet.
                                            </h3>

                                            <p
                                                style={{
                                                    marginTop: "10px",
                                                    marginBottom: 0,
                                                    fontSize: "16px",
                                                    lineHeight: 1.5,
                                                    color: "#6B7280",
                                                }}
                                            >
                                                Your completed attempts will
                                                appear here.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </article>

                <article className={`${styles.card} ${styles.categoryCard}`}>
                    <div className={styles.cardHead}>
                        <h3 className={styles.cardTitle}>
                            Progress by category
                        </h3>
                    </div>
                    <ul className={styles.catList}>
                        {categories.map((c) => {
                            const pct =
                                c.totalModules > 0
                                    ? Math.round(
                                          (c.completedModules /
                                              c.totalModules) *
                                              100,
                                      )
                                    : 0;
                            const accent = categoryAccent(c.key);
                            return (
                                <li key={c.key} className={styles.catRow}>
                                    <div className={styles.catTop}>
                                        <span className={styles.catLabel}>
                                            <span
                                                className={styles.catDot}
                                                style={{ background: accent }}
                                                aria-hidden
                                            />
                                            {c.label}
                                        </span>
                                        <span className={styles.catCount}>
                                            {c.completedModules}/
                                            {c.totalModules}
                                        </span>
                                    </div>
                                    <span className={styles.catTrack}>
                                        <span
                                            className={styles.catFill}
                                            style={{
                                                width: `${pct}%`,
                                                background: accent,
                                            }}
                                        />
                                    </span>
                                    {c.accessibleCourses < c.totalCourses && (
                                        <span className={styles.catLocked}>
                                            {c.accessibleCourses}/
                                            {c.totalCourses} courses unlocked
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </article>

                <article className={`${styles.card} ${styles.communityCard}`}>
                    <div className={styles.cardHead}>
                        <h3 className={styles.cardTitle}>Community</h3>
                    </div>
                    <div className={styles.commGrid}>
                        {[
                            { value: community.comments, label: "Comments" },
                            {
                                value: community.upvotesReceived,
                                label: "Upvotes",
                            },
                            {
                                value: community.helpfulReceived,
                                label: "Helpful marks",
                            },
                            {
                                value: community.bestAnswers,
                                label: "Best answers",
                            },
                        ].map((item, i) => (
                            <div
                                key={item.label}
                                style={
                                    {
                                        "--metric-accent": COMMUNITY_ACCENTS[i],
                                    } as React.CSSProperties
                                }
                            >
                                <span className={styles.commValue}>
                                    {fmtNum(item.value)}
                                </span>
                                <span className={styles.commLabel}>
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                    <Link href="/profile" className={styles.cardFootLink}>
                        View your activity
                    </Link>
                </article>
            </section>

            {/* ── Continue learning ─────────────────────────────────────────── */}
            {continueLearning.length > 0 && (
                <section className={styles.strip}>
                    <div className={styles.stripHead}>
                        <h2 className={styles.stripTitle}>
                            Continue where you left off
                        </h2>
                        <Link href="/learn" className={styles.stripLink}>
                            My Courses
                        </Link>
                    </div>
                    <div className={styles.courseRow}>
                        {continueLearning.map((c) => (
                            <CourseCard
                                key={c.slug}
                                course={c}
                                bookmarked={false}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ── Recommended ───────────────────────────────────────────────── */}
            {recommended.length > 0 && (
                <section className={styles.strip}>
                    <div className={styles.stripHead}>
                        <h2 className={styles.stripTitle}>
                            Recommended for you
                        </h2>
                        <Link
                            href="/browse-courses"
                            className={styles.stripLink}
                        >
                            Browse all
                        </Link>
                    </div>
                    <div className={styles.courseRow}>
                        {recommended.map((c) => (
                            <CourseCard
                                key={c.slug}
                                course={c}
                                bookmarked={false}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ── Completed courses (earned record) ─────────────────────────── */}
            {completions.length > 0 && (
                <section className={styles.strip}>
                    <div className={styles.stripHead}>
                        <h2 className={styles.stripTitle}>Completed courses</h2>
                    </div>
                    <ul className={styles.completedList}>
                        {completions.map(({ course, completedAt }) => (
                            <li key={course.id} className={styles.completedRow}>
                                <Link
                                    href={`/learn/${course.slug}`}
                                    className={styles.completedRowLink}
                                    style={
                                        {
                                            "--card-accent": accentFor(
                                                course.slug,
                                            ),
                                        } as React.CSSProperties
                                    }
                                >
                                    <span
                                        className={styles.completedCheck}
                                        aria-hidden
                                    >
                                        ✓
                                    </span>
                                    <span className={styles.completedRowTitle}>
                                        {course.name}
                                    </span>
                                    <span className={styles.completedRowDate}>
                                        {fmtDate(completedAt)}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}

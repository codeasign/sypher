import type { User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hasCourseAccess } from '../lib/accessControl';
import { CompanyDirectoryRepository } from './CompanyDirectoryRepository';

const companyDirectoryRepository = new CompanyDirectoryRepository();

const DAY_MS = 86_400_000;
const ACTIVITY_WEEKS = 12;
const EXAM_TREND_POINTS = 8;
const PASS_THRESHOLD = 70;

// Same category vocabulary the /learn + /browse-courses board uses, kept in
// sync by hand (small, rarely-changing list).
const CATEGORY_LABELS: Record<string, string> = {
  tech: 'Tech',
  'life-skills': 'Life Skills',
  Presentation: 'Presentation',
};
const UNCATEGORIZED_KEY = 'other';

function categoryKeyOf(raw: string | null): string {
  return raw && raw.trim() ? raw.trim() : UNCATEGORIZED_KEY;
}

function categoryLabelOf(key: string): string {
  if (key === UNCATEGORIZED_KEY) return 'Other';
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
  return key.replace(/(^|[\s\-_/])([a-z])/g, (_, sep: string, ch: string) => `${sep === '_' || sep === '-' ? ' ' : sep}${ch.toUpperCase()}`);
}

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// Shaped to satisfy the web's CourseCardData — the dashboard course strips
// render the SAME <CourseCard> as Browse Courses (Start / Resume / Preview
// pill + progress bar). `hasFullAccess` false ⇒ the card shows "Preview".
export interface DashboardCourseRef {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  category: string | null;
  hasFullAccess: boolean;
  started: boolean;
  completedModules: number;
  totalModules: number;
}

export interface DashboardData {
  plan: {
    role: string;
    isPaidActive: boolean;
    paidUntil: string | null;
    daysRemaining: number | null;
    memberSince: string;
  };
  access: {
    accessibleCourses: number;
    totalCourses: number;
    lockedCourses: number;
    accessiblePercent: number;
  };
  learning: {
    modulesCompleted: number;
    accessibleModules: number;
    modulesCompletedInAccessible: number;
    coursesInProgress: number;
    coursesCompleted: number;
    currentStreakDays: number;
    longestStreakDays: number;
    activeDays: number;
  };
  exams: {
    attempts: number;
    completedAttempts: number;
    bestScore: number | null;
    averageScore: number | null;
    passRate: number | null;
    trend: { label: string; score: number; date: string }[];
  };
  community: {
    comments: number;
    upvotesReceived: number;
    helpfulReceived: number;
    bestAnswers: number;
  };
  activity: {
    weekly: { weekStart: string; modules: number }[];
  };
  categories: {
    key: string;
    label: string;
    completedModules: number;
    totalModules: number;
    accessibleCourses: number;
    totalCourses: number;
  }[];
  continueLearning: DashboardCourseRef[];
  recommended: DashboardCourseRef[];
  platform: {
    learners: number;
    courses: number;
    modules: number;
    mockExams: number;
    lessonsCompletedAllTime: number;
  };
  upgrade: {
    show: boolean;
    lockedCourses: number;
    lockedModules: number;
    highlightedLockedCourses: { slug: string; name: string; category: string | null }[];
  };
}

/**
 * Everything the signed-in user's Dashboard renders, assembled in one
 * pass (~11 parallel queries, all bounded — the catalog is dozens of
 * courses, and per-user progress/attempt/comment rows are small). Access
 * per course is resolved with the same `hasCourseAccess` primitive the
 * course reads use, plus the company-group union for COMPANY_EMPLOYEE.
 */
export class DashboardRepository {
  async build(user: User): Promise<DashboardData> {
    const now = new Date();
    const todayStart = startOfUtcDay(now);

    const [
      courses,
      moduleGroups,
      progressRows,
      courseCompletions,
      attemptsTotal,
      completedAttempts,
      commentAgg,
      bestAnswers,
      accessRows,
      learners,
      mockExams,
      lessonsAllTime,
    ] = await Promise.all([
      prisma.course.findMany({
        where: { status: 'published' },
        select: { id: true, slug: true, name: true, description: true, category: true, coverImageUrl: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.courseModule.groupBy({ by: ['courseId'], _count: { _all: true } }),
      prisma.moduleProgress.findMany({ where: { userId: user.id }, select: { courseId: true, completedAt: true } }),
      prisma.courseCompletion.count({ where: { userId: user.id } }),
      prisma.mockExamAttempt.count({ where: { userId: user.id } }),
      prisma.mockExamAttempt.findMany({
        where: { userId: user.id, status: 'completed' },
        select: { score: true, submittedAt: true, exam: { select: { title: true, examCode: true } } },
        orderBy: { submittedAt: 'asc' },
      }),
      prisma.comment.aggregate({
        where: { userId: user.id, isDeleted: false },
        _sum: { upvoteCount: true, helpfulCount: true },
        _count: { _all: true },
      }),
      prisma.comment.count({ where: { userId: user.id, isDeleted: false, isBestAnswer: true } }),
      prisma.authoredCourseAccess.findMany({ select: { courseId: true, allowedRoles: true } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.mockExam.count({ where: { isPublished: true } }),
      prisma.moduleProgress.count(),
    ]);

    const moduleCountByCourse = new Map(moduleGroups.map((g) => [g.courseId, g._count._all]));
    const allowedByCourse = new Map(accessRows.map((r) => [r.courseId, r.allowedRoles]));

    let companyCourseIds = new Set<string>();
    if (user.companyId) {
      companyCourseIds = new Set(await companyDirectoryRepository.listCourseIdsForUserGroups(user.companyId, user.id));
    }
    const isAccessible = (courseId: string): boolean =>
      hasCourseAccess(user.role, allowedByCourse.get(courseId) ?? [], { companyAllowedSlugs: companyCourseIds, slug: courseId });

    // ── Per-course completed count (clamped to the course's module total) ──
    const completedRawByCourse = new Map<string, number>();
    for (const row of progressRows) {
      completedRawByCourse.set(row.courseId, (completedRawByCourse.get(row.courseId) ?? 0) + 1);
    }
    const completedByCourse = new Map<string, number>();
    for (const course of courses) {
      const total = moduleCountByCourse.get(course.id) ?? 0;
      completedByCourse.set(course.id, Math.min(completedRawByCourse.get(course.id) ?? 0, total));
    }

    // ── Access rollup ──
    const accessibleCourseIds = new Set(courses.filter((c) => isAccessible(c.id)).map((c) => c.id));
    const totalCourses = courses.length;
    const accessibleCourses = accessibleCourseIds.size;
    const publishedModuleTotal = courses.reduce((sum, c) => sum + (moduleCountByCourse.get(c.id) ?? 0), 0);
    const accessibleModules = courses
      .filter((c) => accessibleCourseIds.has(c.id))
      .reduce((sum, c) => sum + (moduleCountByCourse.get(c.id) ?? 0), 0);
    const modulesCompletedInAccessible = courses
      .filter((c) => accessibleCourseIds.has(c.id))
      .reduce((sum, c) => sum + (completedByCourse.get(c.id) ?? 0), 0);

    // ── Learning: streaks + active days from distinct completion days ──
    const dayStamps = new Set<number>();
    for (const row of progressRows) dayStamps.add(startOfUtcDay(row.completedAt));
    const activeDays = dayStamps.size;

    let currentStreakDays = 0;
    let cursor = todayStart;
    if (!dayStamps.has(cursor) && dayStamps.has(cursor - DAY_MS)) cursor -= DAY_MS; // a streak that ran through yesterday still counts today
    while (dayStamps.has(cursor)) {
      currentStreakDays += 1;
      cursor -= DAY_MS;
    }

    let longestStreakDays = 0;
    let run = 0;
    let prev: number | null = null;
    for (const stamp of [...dayStamps].sort((a, b) => a - b)) {
      run = prev !== null && stamp - prev === DAY_MS ? run + 1 : 1;
      longestStreakDays = Math.max(longestStreakDays, run);
      prev = stamp;
    }

    const coursesInProgress = courses.filter((c) => {
      const total = moduleCountByCourse.get(c.id) ?? 0;
      const done = completedByCourse.get(c.id) ?? 0;
      return total > 0 && done > 0 && done < total;
    }).length;

    // ── Weekly activity (12 trailing 7-day windows, oldest → newest) ──
    const weekly = Array.from({ length: ACTIVITY_WEEKS }, (_, i) => {
      const k = ACTIVITY_WEEKS - 1 - i;
      const start = todayStart - (k * 7 + 6) * DAY_MS;
      return { weekStart: new Date(start).toISOString().slice(0, 10), start, end: start + 7 * DAY_MS, modules: 0 };
    });
    for (const row of progressRows) {
      const t = row.completedAt.getTime();
      const bucket = weekly.find((w) => t >= w.start && t < w.end);
      if (bucket) bucket.modules += 1;
    }

    // ── Category rollup ──
    const categoryMap = new Map<
      string,
      { key: string; label: string; completedModules: number; totalModules: number; accessibleCourses: number; totalCourses: number }
    >();
    for (const course of courses) {
      const key = categoryKeyOf(course.category);
      const entry =
        categoryMap.get(key) ??
        categoryMap.set(key, { key, label: categoryLabelOf(key), completedModules: 0, totalModules: 0, accessibleCourses: 0, totalCourses: 0 }).get(key)!;
      entry.totalModules += moduleCountByCourse.get(course.id) ?? 0;
      entry.completedModules += completedByCourse.get(course.id) ?? 0;
      entry.totalCourses += 1;
      if (accessibleCourseIds.has(course.id)) entry.accessibleCourses += 1;
    }
    const categories = [...categoryMap.values()].sort((a, b) => b.totalModules - a.totalModules);

    // ── Continue learning: accessible, in progress, closest to done first ──
    const startedCourseIds = new Set(progressRows.map((r) => r.courseId));
    const toRef = (c: (typeof courses)[number]): DashboardCourseRef => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      coverImageUrl: c.coverImageUrl,
      category: c.category,
      hasFullAccess: accessibleCourseIds.has(c.id),
      started: startedCourseIds.has(c.id),
      completedModules: completedByCourse.get(c.id) ?? 0,
      totalModules: moduleCountByCourse.get(c.id) ?? 0,
    });

    const continueLearning = courses
      .filter((c) => {
        const total = moduleCountByCourse.get(c.id) ?? 0;
        const done = completedByCourse.get(c.id) ?? 0;
        return accessibleCourseIds.has(c.id) && total > 0 && done > 0 && done < total;
      })
      .sort((a, b) => {
        const ra = (completedByCourse.get(a.id) ?? 0) / (moduleCountByCourse.get(a.id) || 1);
        const rb = (completedByCourse.get(b.id) ?? 0) / (moduleCountByCourse.get(b.id) || 1);
        return rb - ra || a.name.localeCompare(b.name);
      })
      .slice(0, 4)
      .map((c) => toRef(c));

    const continueIds = new Set(continueLearning.map((c) => c.slug));
    const notStarted = courses.filter(
      (c) => accessibleCourseIds.has(c.id) && (completedByCourse.get(c.id) ?? 0) === 0 && !continueIds.has(c.slug),
    );
    const lockedCoursesList = courses.filter((c) => !accessibleCourseIds.has(c.id));
    // Lead with a couple of not-started unlocked courses, then surface up to
    // two locked ones (their card shows "Preview") so a free user always
    // sees something to upgrade for; fill any remainder from the rest.
    const recommended = [
      ...notStarted.slice(0, 2).map((c) => toRef(c)),
      ...lockedCoursesList.slice(0, 2).map((c) => toRef(c)),
      ...notStarted.slice(2).map((c) => toRef(c)),
    ].slice(0, 4);

    // ── Exams ──
    const scores = completedAttempts.map((a) => a.score ?? 0);
    const bestScore = scores.length ? Math.max(...scores) : null;
    const averageScore = scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : null;
    const passRate = scores.length ? Math.round((100 * scores.filter((s) => s >= PASS_THRESHOLD).length) / scores.length) : null;
    const trend = completedAttempts.slice(-EXAM_TREND_POINTS).map((a) => ({
      label: a.exam.examCode || a.exam.title,
      score: a.score ?? 0,
      date: a.submittedAt ? a.submittedAt.toISOString() : '',
    }));

    // ── Plan ──
    const isPaidActive = user.role === 'PAID_USER' && !!user.paidUntil && user.paidUntil.getTime() > now.getTime();
    const daysRemaining = isPaidActive && user.paidUntil ? Math.max(0, Math.ceil((user.paidUntil.getTime() - now.getTime()) / DAY_MS)) : null;

    const showUpgrade =
      user.role === 'FREE_USER' || user.role === 'COHORT_USER' || (user.role === 'PAID_USER' && !isPaidActive);

    return {
      plan: {
        role: user.role,
        isPaidActive,
        paidUntil: user.paidUntil ? user.paidUntil.toISOString() : null,
        daysRemaining,
        memberSince: user.createdAt.toISOString(),
      },
      access: {
        accessibleCourses,
        totalCourses,
        lockedCourses: Math.max(0, totalCourses - accessibleCourses),
        accessiblePercent: totalCourses ? Math.round((100 * accessibleCourses) / totalCourses) : 0,
      },
      learning: {
        modulesCompleted: progressRows.length,
        accessibleModules,
        modulesCompletedInAccessible,
        coursesInProgress,
        coursesCompleted: courseCompletions,
        currentStreakDays,
        longestStreakDays,
        activeDays,
      },
      exams: {
        attempts: attemptsTotal,
        completedAttempts: completedAttempts.length,
        bestScore,
        averageScore,
        passRate,
        trend,
      },
      community: {
        comments: commentAgg._count._all,
        upvotesReceived: commentAgg._sum.upvoteCount ?? 0,
        helpfulReceived: commentAgg._sum.helpfulCount ?? 0,
        bestAnswers,
      },
      activity: {
        weekly: weekly.map((w) => ({ weekStart: w.weekStart, modules: w.modules })),
      },
      categories,
      continueLearning,
      recommended,
      platform: {
        learners,
        courses: totalCourses,
        modules: publishedModuleTotal,
        mockExams,
        lessonsCompletedAllTime: lessonsAllTime,
      },
      upgrade: {
        show: showUpgrade,
        lockedCourses: Math.max(0, totalCourses - accessibleCourses),
        lockedModules: Math.max(0, publishedModuleTotal - accessibleModules),
        highlightedLockedCourses: lockedCoursesList.slice(0, 3).map((c) => ({ slug: c.slug, name: c.name, category: c.category })),
      },
    };
  }
}

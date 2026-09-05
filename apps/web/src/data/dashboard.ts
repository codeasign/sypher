// Mirrors apps/api's DashboardRepository.DashboardData (served by
// GET /users/me/dashboard). Kept as a hand-written type — there is no
// generated client — so update both sides together.

// Satisfies CourseCardData (data/courses.ts) — the dashboard course strips
// render the same <CourseCard> as Browse Courses.
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

export interface UserDashboard {
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

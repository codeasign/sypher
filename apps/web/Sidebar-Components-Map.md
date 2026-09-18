# Sidebar → Components Map

Source: `src/components/DashboardSidebar/index.tsx` (renders `NAV_ITEMS` from
`src/lib/navItems.ts`, filtered per-user by `visibleKeys`). Three sections:
Overview (fixed), Manage (dynamic, gated per role/company via NavAccess),
and the footer (Profile / Log out).

## Overview

| Nav item | Route | Page | Main component | Key sub-components |
|---|---|---|---|---|
| Dashboard | `/dashboard` | `dashboard/page.tsx` | `components/DashboardHome` | plan-aware CTA band, dependency-free SVG charts (`components/charts`) |
| Browse Videos | `/browse-videos` | `browse-videos/page.tsx` | inline (no dedicated content component) | — |
| Browse Courses | `/browse-courses` | `browse-courses/page.tsx` | `components/CourseSectionsBoard` | `CourseScroller` |
| My Courses | `/learn` | `learn/page.tsx` | `components/CourseSectionsBoard` | `CourseScroller` |
| Certification Practice Exam | `/mock-tests` | `mock-tests/page.tsx` | `components/MockExamList` | — |
| Practice Coding | `/practice-coding` | `practice-coding/page.tsx` | `components/CodingProblemsBoard` | `CodingProblemCard`, `CodingProblemBookmarkButton`; detail route `practice-coding/[...slug]/page.tsx` → `components/CodingProblemDetail` (IDE/Solutions/Code tabs) → `components/CodingIDE` (Monaco, talks to apps/api's `/coding-problems/judge0/*`), `components/CodingProblemMarkdown` (reuses `CourseModulePage`'s `.body` CSS module) |
| Resources & Guides | `/getting-started` | `getting-started/page.tsx` | inline (no dedicated content component) | — |
| My Bookmarks | `/bookmarks` | `bookmarks/page.tsx` | `bookmarks/BookmarksContent.tsx` | — |

## Manage

Only rendered when the corresponding `NAV_ITEMS` key is in the signed-in
user's `visibleKeys` (role- and company-grant-gated).

| Nav item | Nav key | Route | Page | Main component | Key sub-components |
|---|---|---|---|---|---|
| Manage Access | `manage-access` | `/admin/access` | `admin/access/page.tsx` | `admin/access/AccessManager.tsx` | 4 tabs (Users, User Role, Company Grants, Nav Access); uses `components/Pagination` |
| Manage Cohort | `launch-cohort` | `/launch-cohort` | `launch-cohort/page.tsx` | `launch-cohort/LaunchCohortContent.tsx` | `components/CohortEditor`, `components/ConfirmDialog`, `components/Tooltip` |
| Manage Cohort Users | `manage-cohort-users` | `/manage-cohort-users` | `manage-cohort-users/page.tsx` | `manage-cohort-users/ManageCohortUsersContent.tsx` | `components/ConfirmDialog`, `components/Pagination`, `components/TableSearchBar`, `components/Tooltip` |
| Manage Blog | `manage-blog-post` | `/manage-blog` | `manage-blog/page.tsx` | `manage-blog/ManageBlogContent.tsx` | `components/BlogPostEditor`, `components/Pagination`, `components/TableSearchBar`, `components/Tooltip` |
| Manage Courses | `manage-course-authoring` | `/manage-courses` | `manage-courses/page.tsx` | `manage-courses/ManageCoursesContent.tsx` | `manage-courses/CourseEditor.tsx`, `manage-courses/CourseWorkspace.tsx`, `manage-courses/ModulesTab.tsx`, `components/Pagination`, `components/TableSearchBar`, `components/Tooltip` |
| Course Audit | `course-audit` | `/course-audit` | `course-audit/page.tsx` | `course-audit/CourseAuditContent.tsx` | — |
| Manage Videos | `manage-videos` | `/manage-videos` | `manage-videos/page.tsx` | `manage-videos/ManageVideosContent.tsx` | `manage-videos/VideoEditor.tsx`, `components/Pagination`, `components/TableSearchBar`, `components/Tooltip` (reuses `manage-courses/manage-courses.module.css`) |

## Footer

| Nav item | Route | Page | Main component |
|---|---|---|---|
| Profile | `/profile` | `profile/page.tsx` | `components/ProfileView` |
| Log out | — (POST `/auth/logout`) | — | handled inline in `DashboardSidebar` |

## Shared icon sources

- `src/components/icons/SidebarIcons.tsx` — nav-rail icons (`DashboardIcon`, `CoursesIcon`, `ManageAccessIcon`, etc.)
- `src/components/icons/ActionIcons.tsx` — inline Material Symbols glyphs used inside each Manage page's table/action buttons (view/edit/delete/create icons)

import { HttpError } from './errors';
import { hasCourseAccess } from './accessControl';
import { isModuleFreelyVisible } from './coursePreview';
import { CourseModuleRepository } from '../repositories/CourseModuleRepository';
import { CourseRepository } from '../repositories/CourseRepository';
import { AuthoredCourseAccessRepository } from '../repositories/AuthoredCourseAccessRepository';
import { CompanyDirectoryRepository } from '../repositories/CompanyDirectoryRepository';
import { BlogPostRepository } from '../repositories/BlogPostRepository';
import type { BlogPost, Course, CourseModule, User } from '@prisma/client';

/** Spec-adjacent guardrail (spec §13 leaves length open): 1–5000 chars trimmed. */
const COMMENT_BODY_MAX_LENGTH = 5000;

/**
 * Target-level access gates for discussion endpoints. The module rule
 * mirrors CourseController.getModule exactly (published course → access
 * info → free-preview visibility, locked ⇒ 404) — built from the same
 * building blocks rather than importing that file-private helper, same as
 * MockExamController.hasFullCourseAccess. The blog rule is its own: posts
 * have no lock/preview model, only a published-or-(author‖ADMIN) gate.
 *
 * These gates are the ONLY place content-type differs on the comment API
 * surface; everything past them operates on bare comment ids.
 *
 * Repositories receive already-authorized ids and contain no gating, so a
 * module rule can never leak into the blog path or vice versa.
 */

const courseModuleRepository = new CourseModuleRepository();
const courseRepository = new CourseRepository();
const authoredCourseAccessRepository = new AuthoredCourseAccessRepository();
const companyDirectoryRepository = new CompanyDirectoryRepository();
const blogPostRepository = new BlogPostRepository();

function notFound(): HttpError {
  return new HttpError(404, 'Not found');
}

/**
 * A lesson's discussion is readable/postable by anyone who can read the
 * lesson itself: full course access, or the module sits in the free
 * preview / getting-started window. Everyone else gets 404, matching
 * completeModule's mutation rule.
 */
export async function resolveModuleTargetOr404(user: User | null, moduleId: string): Promise<CourseModule> {
  // Sypher Next has no anonymous course access at all (/learn itself
  // redirects a logged-out visitor to /login) — an anonymous caller can
  // never satisfy the access checks below, so fail fast rather than run
  // them against a null user.
  if (!user) throw notFound();

  const mod = await courseModuleRepository.findById(moduleId);
  if (!mod) throw notFound();

  const course = await courseRepository.findById(mod.courseId);
  if (!course || course.status !== 'published') throw notFound();

  const allowedRoles = await authoredCourseAccessRepository.getAllowedRoles(course.id);
  let companyAllowedIds: Set<string> | undefined;
  if (user.companyId) {
    companyAllowedIds = new Set(
      await companyDirectoryRepository.listCourseIdsForUserGroups(user.companyId, user.id),
    );
  }
  const hasFullAccess = hasCourseAccess(user.role, allowedRoles, {
    companyAllowedSlugs: companyAllowedIds,
    slug: course.id,
  });
  if (!hasFullAccess) {
    const modules = await courseModuleRepository.listForCourse(course.id);
    if (!isModuleFreelyVisible(mod, modules)) throw notFound();
  }
  return mod;
}

/**
 * Blog posts have no lock/preview state — published posts are publicly
 * readable, so their discussions are too. Drafts behave exactly like the
 * post body does under getPublishedBySlug: invisible to everyone except
 * the post's author and ADMIN (who may still read/comment among
 * themselves). Reverting a published post to draft therefore hides its
 * discussion from the public immediately — intentional symmetry with the
 * post disappearing; rows are retained and reappear on republish.
 */
export async function resolveBlogPostTargetOr404(user: User | null, postId: string): Promise<BlogPost> {
  const post = await blogPostRepository.findById(postId);
  if (!post) throw notFound();
  const canSeeDrafts = user !== null && (user.role === 'ADMIN' || post.authorId === user.id);
  if (post.status !== 'published' && !canSeeDrafts) throw notFound();
  return post;
}

/**
 * Course-level discussion (the /learn/[slug] home page's Discussion tab,
 * added 2026-08-27) — mirrors CourseController's courseAccessInfo
 * "visible" rule exactly (built from the same repositories rather than
 * importing that file-private helper, same reasoning as
 * resolveModuleTargetOr404 above): full access, OR any non-empty published
 * course is discoverable/previewable (confirmed 2026-08-22, applies
 * platform-wide). No anonymous path, same as module discussions.
 */
export async function resolveCourseTargetOr404(user: User | null, courseId: string): Promise<Course> {
  if (!user) throw notFound();

  const course = await courseRepository.findById(courseId);
  if (!course || course.status !== 'published') throw notFound();

  const allowedRoles = await authoredCourseAccessRepository.getAllowedRoles(course.id);
  let companyAllowedIds: Set<string> | undefined;
  if (user.companyId) {
    companyAllowedIds = new Set(
      await companyDirectoryRepository.listCourseIdsForUserGroups(user.companyId, user.id),
    );
  }
  const hasFullAccess = hasCourseAccess(user.role, allowedRoles, {
    companyAllowedSlugs: companyAllowedIds,
    slug: course.id,
  });
  if (!hasFullAccess) {
    const moduleCount = await courseModuleRepository.countForCourse(course.id);
    if (moduleCount === 0) throw notFound();
  }
  return course;
}

/**
 * Re-runs the target visibility gate for a comment already fetched via
 * CommentRepository.getActionContext. Every commentId-scoped action
 * (reply list, edit, delete, vote, helpful, best-answer) must call this
 * before touching the comment — the comment's own existence check is not
 * a visibility check, so without this a user with no access to a paid
 * course (or to a draft blog post) could vote/mark-helpful/read replies
 * on comments attached to content they can't otherwise see. Throws
 * HttpError(404) the same way resolveModuleTargetOr404 /
 * resolveBlogPostTargetOr404 do; callers let it propagate (matching the
 * pattern in ModuleCommentController/BlogCommentController).
 */
export async function assertCommentTargetVisible(
  user: User | null,
  target: { courseModuleId: string | null; blogPostId: string | null; courseId: string | null },
): Promise<void> {
  if (target.courseModuleId) {
    await resolveModuleTargetOr404(user, target.courseModuleId);
    return;
  }
  if (target.blogPostId) {
    await resolveBlogPostTargetOr404(user, target.blogPostId);
    return;
  }
  if (target.courseId) {
    await resolveCourseTargetOr404(user, target.courseId);
    return;
  }
  // All three null can't happen (Comment_exactly_one_target CHECK
  // constraint), but fail closed rather than silently allow if it ever did.
  throw notFound();
}

// ─── Shared request-input normalization ───────────────────────────────────

/** Trimmed comment body, or null when empty after trim / over the cap. */
export function normalizeCommentBody(raw: string): string | null {
  const body = raw.trim();
  if (body.length === 0 || body.length > COMMENT_BODY_MAX_LENGTH) return null;
  return body;
}

/** Deduped, non-empty mention ids (cap enforced again defensively at the repository). */
export function cleanMentionIds(raw: string[] | undefined): string[] {
  return [...new Set((raw ?? []).filter((id) => typeof id === 'string' && id.length > 0))];
}

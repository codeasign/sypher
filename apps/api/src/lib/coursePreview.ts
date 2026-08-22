import type { CourseModule } from '@prisma/client';

// Updated 2026-08-22: 20% of each course's modules, ceiling-rounded (same
// >=1-for-any-nonempty-course guarantee as before), capped at 10 so large
// courses (e.g. agentic-ai-fundamentals at 234 modules) don't give away an
// uncapped-percentage-sized chunk. Small courses still round up past a
// flat 20% same as the old 15% formula did -- that tradeoff is unchanged,
// only the percentage and the new upper cap are new.
export function computeFreePreviewCount(totalModules: number): number {
  return Math.min(Math.ceil(totalModules * 0.2), 10);
}

// Sequential first-N by orderIndex -- orderIndex is already the single
// authoritative pedagogical sequence used everywhere else (Prev/Next,
// the module index, Task 2 import), confirmed as the only sensible
// interpretation, not a manually-curated set.
//
// `orderedModules` must already be sorted by orderIndex ascending (see
// CourseModuleRepository.listForCourse) -- this does not sort, it trusts
// the caller's order, same convention as everywhere else that consumes
// this list.
export function isModuleInFreePreview(module: CourseModule, orderedModules: CourseModule[]): boolean {
  const freeCount = computeFreePreviewCount(orderedModules.length);
  const rank = orderedModules.findIndex((m) => m.id === module.id);
  return rank !== -1 && rank < freeCount;
}

// Additive with showInGettingStarted, confirmed -- a getting-started
// module outside the first N still counts as free on top of the 15%,
// this can push the effective free percentage above 15% once
// getting-started flags are used on a course that also has this
// mechanism. Not a bug, confirmed and accepted.
export function isModuleFreelyVisible(module: CourseModule, orderedModules: CourseModule[]): boolean {
  return module.showInGettingStarted || isModuleInFreePreview(module, orderedModules);
}

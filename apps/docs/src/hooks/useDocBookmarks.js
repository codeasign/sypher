// TODO(Phase 5): real useDocBookmarks.js lives in apps/app/src/hooks/useDocBookmarks.js.
// See useBookmarks.js — same reasoning, same plan.
export function useDocBookmarks() {
  return {
    isDocBookmarked: () => false,
    toggleDocBookmark: () => {},
  };
}

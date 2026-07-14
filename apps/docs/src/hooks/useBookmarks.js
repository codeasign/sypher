// TODO(Phase 5): real useBookmarks.js lives in apps/app/src/hooks/useBookmarks.js
// and reads/writes bookmarks via Supabase. Docs can't write bookmarks anymore
// (that moved to app.sypher) and has no session to read them for — every
// consumer already gates its bookmark UI behind a logged-in `user`, which this
// stub's AuthContext never provides, so this never renders as bookmarked.
export function useBookmarks() {
  return {
    isBookmarked: () => false,
    toggleBookmark: () => {},
  };
}

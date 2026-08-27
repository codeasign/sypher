# Sypher Lesson Discussion System — Build Spec

Target: `sypher-next-dev-v2` branch — Next.js `apps/web` + Express/tsoa `apps/api`, Prisma/Postgres, repository pattern, session-cookie auth. Follow existing project conventions (tsoa DTO naming prefixed by domain, repository pattern for all DB access, no direct Prisma calls from controllers).

## 1. Feature summary

Under each lesson (`CourseModule`), learners see a "💬 Discussion" section where they can:
- Post a comment
- Reply to a comment
- @mention another user
- Upvote / downvote a comment
- Mark a comment "Helpful"
- Mark one comment as "Best Answer"
- See an Instructor badge on instructor/admin replies

## 2. Threading model — FLAT, not deep nesting

- Two levels only: top-level comments, and one flat reply list per top-level comment.
- A reply to a reply does **not** create a third nesting level — it stays in the same flat list under the original top-level comment, with `@username` prepended to attribute it to the specific person being replied to.
- `Comment.parentId` therefore only ever points at a top-level comment, or is `null` for a top-level comment. No `depth` field, no `rootId` field, no recursive tree-building needed.
- Fetching a lesson's full discussion = one query for top-level comments (`parentId IS NULL`) + one query for all replies (`parentId IN (...)`), grouped in memory by `parentId`.

## 3. Comment type

- Single generic comment type. Do **not** build Question/Comment/Tip as a distinct field or selector — that was scoped and then intentionally dropped.
- Best Answer applies to any top-level comment (see §7), not restricted to a "question" type.

## 4. Voting

- One vote per `(commentId, userId)`, type `UP` or `DOWN`.
- Clicking the same vote again removes it. Clicking the opposite vote flips it.
- `Comment.score`, `upvoteCount`, `downvoteCount` are cached on the row and updated atomically inside the same transaction as the vote change — never computed by counting rows on read.

## 5. Helpful

- Separate toggle, independent of voting and of Best Answer.
- Many users can each mark a comment Helpful; cached `helpfulCount` on the comment row, updated transactionally.

## 6. Sorting

- One sort control governs the entire discussion (both top-level comments and each comment's reply list) — not independent controls per level.
- Modes: **Chronological** (default), **Upvotes** (by `score`), **Most Useful** (by `helpfulCount`).
- Default state (before the user touches the sort control): top-level comments **newest-first**, replies within a comment **oldest-first** (chronological reading order). Once a sort mode is explicitly selected, that mode applies uniformly to both levels.
- Use `createdAt` as a stable secondary tiebreaker for the Upvotes and Most Useful sort modes.

## 7. Best Answer

- Applies to any top-level comment (not scoped to a comment type).
- Settable only by: the top-level comment's own author, or a user with role `INSTRUCTOR` or `ADMIN`.
- Only one Best Answer per top-level comment's discussion group at a time — setting a new one must unset the previous one in the same transaction.
- Confirm exact scope before building: is "one Best Answer" scoped per top-level comment (i.e., can each top-level comment in a lesson have its own Best Answer among its replies), or one Best Answer for the entire lesson discussion? Build assuming **per top-level comment** unless told otherwise — that matches the original "learner asks a question, one reply gets marked Best Answer" framing.

## 8. Instructor badge

- Derived live from `user.role` at query/render time (`INSTRUCTOR` or `ADMIN`).
- Never stored on the `Comment` row — avoids staleness if a user's role changes after they've already commented.

## 9. Edit

- Owner-only.
- No time restriction — editable indefinitely.
- Sets `isEdited = true`, `editedAt = now()` on save. Render "(edited)" next to the timestamp when `isEdited` is true.

## 10. Delete

- **Soft-delete internally, hard-delete in appearance.** The row is retained in the database (flagged, e.g. `isDeleted = true`, `deletedAt`) for audit/moderation purposes — but it must **not** render anywhere a normal user or instructor can see it, and must **not** show a "[deleted]" placeholder. To end users, it should look exactly as if the row were gone.
- Deleting a top-level comment cascades to also flag-hide all of its replies (both become invisible together) — implement this explicitly in the delete transaction; do not rely only on the DB's `onDelete: Cascade` (that's for hard deletes) since these rows must persist.
- Who can delete: the comment's owner, or a user with role `INSTRUCTOR`/`ADMIN` (moderation).
- Out of scope for this pass, flag as future work: retention/purge policy for soft-deleted rows, and an admin UI to view soft-deleted content when investigating a report.

## 11. @mentions and user handles

- Mentions must resolve to a real, unique user — never keyed on display name (display names can collide, e.g. two "Andrew Smith"s).
- **New requirement on `User`:** add a unique `username` (handle) field, separate from `displayName`.
  - Format: lowercase, alphanumeric + underscore, reasonable length bounds (e.g. 3–20 chars). Enforce uniqueness at the DB level (unique index) and validate format server-side.
  - Auto-generate at signup (from email prefix or display name, with a numeric suffix appended on collision, e.g. `andrewsmith`, `andrewsmith2`) so mentions work without requiring a setup step.
  - Must be user-editable later from profile settings, with the same uniqueness/format validation applied on change.
- Mention autocomplete: as the user types `@` + partial text, query `User` by `username` prefix (case-insensitive), return a short list of candidates (username + displayName + avatar) so the author can visually disambiguate before selecting — this is the actual point at which two "Andrew Smith"s get told apart.
- What gets stored: the mention selected from the autocomplete dropdown creates a `CommentMention` row keyed by `mentionedUserId` (the real user ID) — never by a raw username string. This means a later handle change never breaks old mentions.
- What gets rendered: only mentions that came from an actual autocomplete selection become tracked, styled mentions. Free-typed text that merely looks like `@SomeText` (never selected from the dropdown) renders as plain text — do not attempt to fuzzy-match display names after the fact, since that reintroduces the exact ambiguity problem this system exists to avoid.
- **Comment display:** show `displayName` as the primary name, with the `username` handle shown alongside in smaller/muted styling for disambiguation — e.g. "Andrew Smith · @andrew_smith". Always show the user's avatar too; it does most of the disambiguation work in practice.

## 12. Data model (guidance, not exact schema — use existing project conventions for naming/style)

`Comment`
- `id`, `courseModuleId` (FK), `userId` (FK, author), `parentId` (FK to Comment, nullable — top-level if null, otherwise always points at a top-level comment, never at another reply)
- `body` (text)
- `upvoteCount`, `downvoteCount`, `score`, `helpfulCount` (cached ints)
- `isBestAnswer` (bool)
- `isEdited` (bool), `editedAt` (nullable datetime)
- `isDeleted` (bool), `deletedAt` (nullable datetime)
- `createdAt`, `updatedAt`
- Index on `(courseModuleId, parentId)` for the two-query fetch pattern in §2.

`CommentVote` — unique on `(commentId, userId)`, `type: UP | DOWN`.

`CommentHelpful` — unique on `(commentId, userId)`.

`CommentMention` — unique on `(commentId, mentionedUserId)`.

`User` — add unique `username` field (see §11).

## 13. API surface (guidance)

- `GET /modules/{moduleId}/comments?sort=&cursor=` — top-level comments, paginated.
- `GET /comments/{commentId}/replies?sort=` — flat reply list for a top-level comment.
- `POST /modules/{moduleId}/comments` — create top-level comment or reply (`parentId` optional; if present, must reference an existing top-level comment).
- `PATCH /comments/{commentId}` — edit (owner-only).
- `DELETE /comments/{commentId}` — soft-delete (owner or instructor/admin); cascades to replies if deleting a top-level comment.
- `POST /comments/{commentId}/vote` — body `{ type: UP | DOWN }`, toggle semantics per §4.
- `POST /comments/{commentId}/helpful` — toggle per §5.
- `POST /comments/{commentId}/best-answer` — set Best Answer per §7 (author or instructor/admin only, unsets any previous one for that top-level comment's group).
- `GET /users/mention-search?q=` — username-prefix search for the mention autocomplete.

## 14. Explicitly out of scope for this pass

- Real-time updates (websockets/live refresh) — not needed at this scale; refresh-on-action is fine.
- Notification delivery on mention/reply — infra exists (Brevo email rotation) but wiring it up is a separate task.
- Retention/purge job for soft-deleted comments, and an admin view for investigating deleted content.
- Public profile pages or anywhere else the new `username` field might surface outside of comments/mentions — confirm before building if this is wanted now or later.

## 15. Cost/infra note

No new services required. Runs entirely on the existing Postgres droplet + Express API + Next.js app. Mention autocomplete is a simple indexed `username` prefix query against the existing `User` table — no search service needed at this scale.

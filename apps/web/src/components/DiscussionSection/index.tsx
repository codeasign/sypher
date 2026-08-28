'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  COMMENT_SORT_MODES,
  createBlogPostComment,
  createCourseComment,
  createModuleComment,
  listBlogPostComments,
  listCommentReplies,
  listCourseComments,
  listModuleComments,
  type CommentListPageData,
  type CommentSortMode,
  type CommentView,
  type MentionCandidateData,
} from '@/data/comments';
import Composer from './Composer';
import CommentItem from './CommentItem';
import styles from './styles.module.css';

type DiscussionTargetType = 'courseModule' | 'blogPost' | 'course';

interface DiscussionSectionProps {
  /** What this discussion is attached to — the ONLY content-type switch in the UI. */
  targetType: DiscussionTargetType;
  targetId: string;
  /** Badge text for the content author: "Instructor" on lessons, "Author" on blogs/course discussions. */
  badgeLabel: string;
  /**
   * Best-Answer marking/highlighting — lessons only by product decision
   * (blogs and whole-course discussions aren't Q&A). The backend stays
   * uniform either way.
   */
  showBestAnswerUI?: boolean;
}

// Single dispatch point per operation (list/create) instead of a 3-way
// ternary repeated at every call site — one branch to update if a fourth
// target type ever shows up.
function listForTarget(
  targetType: DiscussionTargetType,
  targetId: string,
  mode: CommentSortMode,
  cursor?: string,
): ReturnType<typeof listModuleComments> {
  if (targetType === 'courseModule') return listModuleComments(targetId, mode, cursor);
  if (targetType === 'blogPost') return listBlogPostComments(targetId, mode, cursor);
  return listCourseComments(targetId, mode, cursor);
}

function createForTarget(
  targetType: DiscussionTargetType,
  targetId: string,
  input: { body: string; parentId?: string; mentionedUserIds: string[] },
): ReturnType<typeof createModuleComment> {
  if (targetType === 'courseModule') return createModuleComment(targetId, input);
  if (targetType === 'blogPost') return createBlogPostComment(targetId, input);
  return createCourseComment(targetId, input);
}

interface MeUser {
  id: string;
  username: string;
  fullName: string | null;
  role: string;
}

type RepliesMap = Record<string, CommentView[]>;

/**
 * Unique commenters across a set of comments, as mention candidates —
 * offered the moment someone types a bare "@" so tagging a person already
 * in the thread takes no typing. The viewer is dropped (you don't @yourself).
 */
function participantsOf(comments: CommentView[], excludeUserId: string | null): MentionCandidateData[] {
  const byId = new Map<string, MentionCandidateData>();
  for (const c of comments) {
    if (c.author.id === excludeUserId || byId.has(c.author.id)) continue;
    byId.set(c.author.id, { id: c.author.id, username: c.author.username, fullName: c.author.fullName });
  }
  return [...byId.values()];
}

function sortForClient(comments: CommentView[], mode: CommentSortMode): CommentView[] {
  const sorted = [...comments];
  if (mode === 'chrono') {
    // Tops newest-first after a local insert; server order already matches.
    return sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  const primary = mode === 'upvotes' ? (c: CommentView) => c.score : (c: CommentView) => c.helpfulCount;
  return sorted.sort(
    (a, b) =>
      primary(b) - primary(a) ||
      Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
      (a.id < b.id ? 1 : -1),
  );
}

/**
 * 💬 Discussion section — flat two-level comment threads under a lesson or
 * blog post (spec §2–§11). One sort control governs both levels uniformly
 * once selected; the untouched default shows tops newest-first and replies
 * oldest-first (reading order). Refresh-on-action per spec §14 — no live
 * updates.
 */
export default function DiscussionSection({
  targetType,
  targetId,
  badgeLabel,
  showBestAnswerUI = false,
}: DiscussionSectionProps): React.JSX.Element {
  const [me, setMe] = useState<MeUser | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [sort, setSort] = useState<CommentSortMode>('chrono');
  const [tops, setTops] = useState<CommentView[]>([]);
  const [replies, setReplies] = useState<RepliesMap>({});
  const [viewerIsContentAuthor, setViewerIsContentAuthor] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  // Threads start collapsed (replies hidden behind the parent's toggle);
  // this map only records what the viewer has explicitly expanded.
  const [expandedTops, setExpandedTops] = useState<Record<string, boolean>>({});

  const canModerate = viewerIsContentAuthor || me?.role === 'ADMIN';

  const fetchRepliesFor = useCallback(async (topsPage: CommentView[], mode: CommentSortMode) => {
    const pages = await Promise.all(topsPage.map((top) => listCommentReplies(top.id, mode)));
    return pages.reduce<RepliesMap>((acc, result, index) => {
      acc[topsPage[index].id] = result.page?.comments ?? [];
      return acc;
    }, {});
  }, []);

  const applyPage = useCallback((page: CommentListPageData, mode: CommentSortMode, append: boolean) => {
    setTops((prev) => {
      const merged = append ? [...prev, ...page.comments] : page.comments;
      // Keep visible ordering consistent with the active sort even though
      // the server already ordered each individual page.
      return sortForClient(merged, mode);
    });
    setNextCursor(page.nextCursor);
    setViewerIsContentAuthor(page.viewerIsContentAuthor);
  }, []);

  const load = useCallback(
    async (mode: CommentSortMode) => {
      setInitialLoading(true);
      const result = await listForTarget(targetType, targetId, mode);
      if (!result.page) {
        setInitialLoading(false);
        return;
      }
      applyPage(result.page, mode, false);
      const replyMap = await fetchRepliesFor(result.page.comments, mode);
      setReplies(replyMap);
      setInitialLoading(false);
    },
    [targetType, targetId, applyPage, fetchRepliesFor],
  );

  useEffect(() => {
    let cancelled = false;
    async function boot(): Promise<void> {
      const res = await apiFetch('/auth/me');
      if (!cancelled) {
        setMe(res.ok ? await res.json() : null);
        setMeLoaded(true);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void load(sort);
  }, [load, sort]);

  function updateCommentEverywhere(updated: CommentView): void {
    setTops((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setReplies((prev) => {
      const next: RepliesMap = {};
      for (const [parentId, list] of Object.entries(prev)) {
        next[parentId] = updated.parentId === parentId ? list.map((c) => (c.id === updated.id ? updated : c)) : list;
      }
      return next;
    });
  }

  function handleVoted(commentId: string, state: NonNullable<Awaited<ReturnType<typeof import('@/data/comments').voteComment>>['state']>): void {
    const patch = (c: CommentView): CommentView =>
      c.id === commentId
        ? { ...c, upvoteCount: state.upvoteCount, downvoteCount: state.downvoteCount, score: state.score, viewerVote: state.viewerVote }
        : c;
    setTops((prev) => prev.map(patch));
    setReplies((prev) => {
      const next: RepliesMap = {};
      for (const [parentId, list] of Object.entries(prev)) next[parentId] = list.map(patch);
      return next;
    });
  }

  function handleHelpful(commentId: string, state: NonNullable<Awaited<ReturnType<typeof import('@/data/comments').toggleCommentHelpful>>['state']>): void {
    const patch = (c: CommentView): CommentView =>
      c.id === commentId ? { ...c, helpfulCount: state.helpfulCount, viewerHelpful: state.viewerHelpful } : c;
    setTops((prev) => prev.map(patch));
    setReplies((prev) => {
      const next: RepliesMap = {};
      for (const [parentId, list] of Object.entries(prev)) next[parentId] = list.map(patch);
      return next;
    });
  }

  function handleDeleted(commentId: string): void {
    // Soft-deleted rows never come back from the API — remove entirely,
    // no "[deleted]" placeholder anywhere (spec §10).
    let wasReply = false;
    let parentIdOfDeleted: string | null = null;
    setReplies((prev) => {
      const next: RepliesMap = {};
      for (const [parentId, list] of Object.entries(prev)) {
        if (list.some((c) => c.id === commentId)) {
          wasReply = true;
          parentIdOfDeleted = parentId;
          next[parentId] = list.filter((c) => c.id !== commentId);
        } else {
          next[parentId] = list;
        }
      }
      return next;
    });
    if (wasReply && parentIdOfDeleted) {
      const pid: string = parentIdOfDeleted;
      setTops((prev) => prev.map((t) => (t.id === pid ? { ...t, replyCount: Math.max(0, (t.replyCount ?? 1) - 1) } : t)));
    } else {
      setTops((prev) => prev.filter((c) => c.id !== commentId));
      setReplies((prev) => {
        const { [commentId]: _removed, ...rest } = prev;
        return rest;
      });
    }
  }

  async function handleSubmitTopLevel(body: string, mentionedUserIds: string[]): Promise<{ error: string | null }> {
    setComposerError(null);
    const result = await createForTarget(targetType, targetId, { body, mentionedUserIds });
    if (result.error || !result.comment) {
      setComposerError(result.error ?? 'Could not post the comment');
      return { error: result.error ?? 'Could not post the comment' };
    }
    const created = result.comment;
    setTops((prev) => sortForClient([{ ...created, replyCount: 0 }, ...prev], sort));
    return { error: null };
  }

  async function handleSubmitReply(parentId: string, body: string, mentionedUserIds: string[]): Promise<{ error: string | null; reply: CommentView | null }> {
    const result = await createForTarget(targetType, targetId, { body, parentId, mentionedUserIds });
    if (result.error || !result.comment) return { error: result.error, reply: null };
    const reply = result.comment;
    setReplies((prev) => ({
      ...prev,
      [parentId]: sortForClient([...(prev[parentId] ?? []), reply], sort),
    }));
    // The replier obviously wants to see their reply — expand the thread.
    setExpandedTops((prev) => ({ ...prev, [parentId]: true }));
    setTops((prev) => prev.map((t) => (t.id === parentId ? { ...t, replyCount: (t.replyCount ?? 0) + 1 } : t)));
    return { error: null, reply };
  }

  async function handleLoadMore(): Promise<void> {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const result = await listForTarget(targetType, targetId, sort, nextCursor);
    setLoadingMore(false);
    if (!result.page) return;
    applyPage(result.page, sort, true);
    const replyMap = await fetchRepliesFor(result.page.comments, sort);
    setReplies((prev) => ({ ...prev, ...replyMap }));
  }

  const totalVisible = tops.length + Object.values(replies).reduce((sum, list) => sum + list.length, 0);

  return (
    <section className={styles.discussion} aria-label="Discussion">
      <div className={styles.headerRow}>
        <h2 className={styles.heading}>💬 Discussion</h2>
        {COMMENT_SORT_MODES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`${styles.sortButton} ${sort === value ? styles.sortButtonActive : ''}`}
            onClick={() => setSort(value)}
            aria-pressed={sort === value}
          >
            {label}
          </button>
        ))}
      </div>

      {meLoaded && me && (
        <div className={styles.composerSlot}>
          <Composer
            placeholder="Add to the discussion… — type @ to tag someone"
            submitLabel="Post Comment"
            participants={participantsOf([...tops, ...Object.values(replies).flat()], me.id)}
            onSubmit={handleSubmitTopLevel}
          />
        </div>
      )}
      {meLoaded && !me && (
        <p className={styles.signInPrompt}>
          <Link href="/login">Sign in</Link> to join the discussion.
        </p>
      )}

      {!meLoaded && composerError === null && <p className={styles.loadingNote}>Loading…</p>}
      {initialLoading && <p className={styles.loadingNote}>Loading comments…</p>}
      {!initialLoading && totalVisible === 0 && (
        <p className={styles.emptyNote}>No comments yet{me ? ' — start the conversation above.' : '.'}</p>
      )}

      <div className={styles.threadList}>
        {tops.map((top) => {
          const threadReplies = replies[top.id] ?? [];
          const threadParticipants = participantsOf([top, ...threadReplies], me?.id ?? null);
          return (
            <div key={top.id} className={styles.thread}>
              <CommentItem
                comment={top}
                isReply={false}
                threadRootId={top.id}
                rootAuthorId={top.author.id}
                participants={threadParticipants}
                me={me}
                viewerCanModerate={canModerate}
                badgeLabel={badgeLabel}
                showBestAnswerUI={showBestAnswerUI}
                onVoted={handleVoted}
                onHelpful={handleHelpful}
                onEdited={updateCommentEverywhere}
                onDeleted={handleDeleted}
                submitReply={handleSubmitReply}
                onBestAnswerChanged={() => void load(sort)}
                replyCount={Math.max(top.replyCount ?? 0, threadReplies.length)}
                repliesCollapsed={!expandedTops[top.id]}
                onToggleReplies={() => setExpandedTops((prev) => ({ ...prev, [top.id]: !prev[top.id] }))}
              />
              {expandedTops[top.id] && threadReplies.length > 0 && (
                <div className={styles.replyList}>
                  {threadReplies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      isReply
                      threadRootId={top.id}
                      rootAuthorId={top.author.id}
                      participants={threadParticipants}
                      me={me}
                      viewerCanModerate={canModerate}
                      badgeLabel={badgeLabel}
                      showBestAnswerUI={showBestAnswerUI}
                      onVoted={handleVoted}
                      onHelpful={handleHelpful}
                      onEdited={updateCommentEverywhere}
                      onDeleted={handleDeleted}
                      submitReply={handleSubmitReply}
                      onBestAnswerChanged={() => void load(sort)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {nextCursor !== null && !initialLoading && (
        <button type="button" className={styles.loadMoreButton} onClick={() => void handleLoadMore()} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : 'Load more comments'}
        </button>
      )}
    </section>
  );
}

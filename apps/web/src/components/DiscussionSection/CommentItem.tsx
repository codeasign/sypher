'use client';

import { useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import Tooltip from '@/components/Tooltip';
import { EditIcon, DeleteIcon } from '@/components/icons/ActionIcons';
import {
  deleteComment,
  editComment,
  markBestAnswer,
  toggleCommentHelpful,
  voteComment,
  type CommentView,
} from '@/data/comments';
import Composer, { initialsOf } from './Composer';
import styles from './styles.module.css';

interface CommentItemProps {
  comment: CommentView;
  isReply: boolean;
  /** Thread-root author id — Best-Answer rights anchor (spec §7). */
  rootAuthorId: string;
  me: { id: string; role: string } | null;
  viewerCanModerate: boolean;
  badgeLabel: string;
  showBestAnswerUI: boolean;
  onVoted: (commentId: string, state: NonNullable<Awaited<ReturnType<typeof voteComment>>['state']>) => void;
  onHelpful: (commentId: string, state: NonNullable<Awaited<ReturnType<typeof toggleCommentHelpful>>['state']>) => void;
  onEdited: (updated: CommentView) => void;
  onDeleted: (commentId: string) => void;
  /** Parent performs the reply API call and returns the created view. */
  submitReply: (parentId: string, body: string, mentionedUserIds: string[]) => Promise<{ error: string | null; reply: CommentView | null }>;
  /** A Best Answer was set anywhere — parent refreshes the thread (previous holder may sit anywhere). */
  onBestAnswerChanged: () => void;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Renders ONLY tracked mentions as chips: body tokens matching one of the
 * comment's CommentMention usernames (userId-keyed rows resolved at read
 * time). Free-typed "@text" that never came from the dropdown has no
 * matching mention row and stays plain — deliberately, per spec §11.
 */
function renderBody(body: string, mentions: CommentView['mentions']): React.JSX.Element[] {
  if (mentions.length === 0) return [<span key="body">{body}</span>];
  const escaped = mentions.map((m) => m.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(^|\\s)@(${escaped.join('|')})(?=\\s|$|[^a-z0-9_])`, 'gi');
  const parts: React.JSX.Element[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    const username = match[2];
    const tokenStart = match.index + match[1].length;
    if (tokenStart > last) parts.push(<span key={key++}>{body.slice(last, tokenStart)}</span>);
    parts.push(
      <span key={key++} className={styles.mentionChip}>
        @{username}
      </span>,
    );
    last = tokenStart + username.length + 1;
    if (match.index === re.lastIndex) re.lastIndex += 1; // zero-length safety
  }
  if (last < body.length) parts.push(<span key={key++}>{body.slice(last)}</span>);
  return parts;
}

export default function CommentItem({
  comment,
  isReply,
  rootAuthorId,
  me,
  viewerCanModerate,
  badgeLabel,
  showBestAnswerUI,
  onVoted,
  onHelpful,
  onEdited,
  onDeleted,
  submitReply,
  onBestAnswerChanged,
}: CommentItemProps): React.JSX.Element {
  const [votePending, setVotePending] = useState(false);
  const [helpfulPending, setHelpfulPending] = useState(false);
  const [bestPending, setBestPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwner = me !== null && comment.author.id === me.id;
  // Delete: owner or moderator (content author / ADMIN) — spec §10.
  const canDelete = isOwner || viewerCanModerate;
  // Best-Answer marking: the thread-root's own author or a moderator — §7.
  const canMarkBest =
    showBestAnswerUI && !comment.isBestAnswer && me !== null && (rootAuthorId === me.id || viewerCanModerate);

  async function handleVote(type: 'UP' | 'DOWN'): Promise<void> {
    if (!me || votePending) return;
    setVotePending(true);
    const result = await voteComment(comment.id, type);
    setVotePending(false);
    if (result.state) onVoted(comment.id, result.state);
  }

  async function handleHelpful(): Promise<void> {
    if (!me || helpfulPending) return;
    setHelpfulPending(true);
    const result = await toggleCommentHelpful(comment.id);
    setHelpfulPending(false);
    if (result.state) onHelpful(comment.id, result.state);
  }

  async function handleMarkBest(): Promise<void> {
    if (bestPending) return;
    setBestPending(true);
    const result = await markBestAnswer(comment.id);
    setBestPending(false);
    // The previous holder may sit anywhere in the thread, so the parent
    // refetches it rather than patching two rows locally (refresh-on-action).
    if (!result.error) onBestAnswerChanged();
  }

  async function handleDelete(): Promise<void> {
    const result = await deleteComment(comment.id);
    setConfirmDelete(false);
    if (!result.error) onDeleted(comment.id);
  }

  const showBadge = comment.isContentAuthor || comment.author.role === 'ADMIN';
  const badgeText = comment.author.role === 'ADMIN' && !comment.isContentAuthor ? 'Admin' : badgeLabel;

  return (
    <article className={`${styles.commentItem} ${isReply ? styles.commentItemReply : ''}`}>
      {comment.isBestAnswer && (
        <div className={styles.bestAnswerBanner}>✔ Best Answer</div>
      )}
      <div className={styles.commentHeaderRow}>
        <span className={`${styles.avatar} ${isReply ? styles.avatarSmall : ''}`} aria-hidden="true">
          {initialsOf(comment.author.fullName, comment.author.username)}
        </span>
        <div className={styles.commentIdentity}>
          <span className={styles.commentName}>{comment.author.fullName || comment.author.username}</span>
          <span className={styles.commentHandle}>@{comment.author.username}</span>
          {showBadge && <span className={styles.badge}>{badgeText}</span>}
          <span className={styles.commentTimestamp} title={new Date(comment.createdAt).toLocaleString()}>
            {formatTimestamp(comment.createdAt)}
            {comment.isEdited && ' (edited)'}
          </span>
        </div>
      </div>

      {editing ? (
        <Composer
          placeholder="Edit your comment"
          submitLabel="Save"
          initialBody={comment.body}
          initialMentionUsernames={comment.mentions.map((m) => m.username)}
          autoFocus
          onSubmit={async (body, mentionedUserIds) => {
            const result = await editComment(comment.id, { body, mentionedUserIds });
            if (!result.error && result.comment) {
              onEdited(result.comment);
              setEditing(false);
            }
            return { error: result.error };
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <p className={styles.commentBody}>{renderBody(comment.body, comment.mentions)}</p>
      )}

      {!editing && (
        <div className={`${styles.actionRow} ${isOwner ? styles.actionRowOwner : ''}`}>
          {isOwner ? (
            <span className={styles.ownerActions}>
              <Tooltip label="Edit comment">
                <button type="button" className={`${styles.actionBtn} ${styles.actionBtnEdit}`} aria-label="Edit comment" onClick={() => setEditing(true)}>
                  <EditIcon />
                </button>
              </Tooltip>
              <Tooltip label="Delete comment">
                <button type="button" className={`${styles.actionBtn} ${styles.actionBtnDanger}`} aria-label="Delete comment" onClick={() => setConfirmDelete(true)}>
                  <DeleteIcon />
                </button>
              </Tooltip>
            </span>
          ) : (
            <>
              <span className={styles.voteGroup}>
                <button
                  type="button"
                  className={`${styles.voteButton} ${comment.viewerVote === 'UP' ? styles.voteButtonActiveUp : ''}`}
                  disabled={!me || votePending}
                  onClick={() => void handleVote('UP')}
                  aria-pressed={comment.viewerVote === 'UP'}
                  aria-label="Upvote"
                  title={me ? 'Upvote' : 'Sign in to vote'}
                >
                  ▲
                </button>
                <span className={styles.score}>{comment.score}</span>
                <button
                  type="button"
                  className={`${styles.voteButton} ${comment.viewerVote === 'DOWN' ? styles.voteButtonActiveDown : ''}`}
                  disabled={!me || votePending}
                  onClick={() => void handleVote('DOWN')}
                  aria-pressed={comment.viewerVote === 'DOWN'}
                  aria-label="Downvote"
                  title={me ? 'Downvote' : 'Sign in to vote'}
                >
                  ▼
                </button>
              </span>

              <button
                type="button"
                className={`${styles.helpfulButton} ${comment.viewerHelpful ? styles.helpfulButtonActive : ''}`}
                disabled={!me || helpfulPending}
                onClick={() => void handleHelpful()}
                aria-pressed={comment.viewerHelpful}
              >
                Helpful{comment.helpfulCount > 0 ? ` (${comment.helpfulCount})` : ''}
              </button>

              {showBestAnswerUI &&
                (comment.isBestAnswer ? (
                  <span className={styles.bestAnswerChip}>✔ Best Answer</span>
                ) : (
                  canMarkBest && (
                    <button type="button" className={styles.bestButton} disabled={bestPending} onClick={() => void handleMarkBest()}>
                      Mark as Best Answer
                    </button>
                  )
                ))}

              {!isReply && me && (
                <button type="button" className={styles.replyButton} onClick={() => setReplyOpen((open) => !open)}>
                  Reply
                </button>
              )}

              {canDelete && (
                <button type="button" className={`${styles.textActionButton} ${styles.deleteAction}`} onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      )}

      {replyOpen && me && (
        <Composer
          compact
          autoFocus
          placeholder={`Reply to ${comment.author.fullName || comment.author.username}… — @mention with the dropdown`}
          submitLabel="Reply"
          onSubmit={async (body, mentionedUserIds) => {
            const result = await submitReply(comment.id, body, mentionedUserIds);
            if (!result.error && result.reply) setReplyOpen(false);
            return { error: result.error };
          }}
          onCancel={() => setReplyOpen(false)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this comment?"
        message={
          isReply
            ? 'This removes the reply for everyone. It cannot be undone.'
            : 'This removes the comment AND all of its replies for everyone. It cannot be undone.'
        }
        confirmLabel="Delete"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </article>
  );
}

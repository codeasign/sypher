'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { uploadToBunny } from '@/data/bunnyUpload';
import { PRESET_AVATARS } from '@/data/onboarding';
import {
  fetchMyComments,
  updateProfile,
  type ActivityComment,
  type ActivityCommentPage,
  type ActivityReplies,
  type ActivityTab,
  type ProfileCounts,
  type ProfileMe,
} from '@/data/profile';
import { roleLabel } from '@/lib/roleLabels';
import styles from './styles.module.css';

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const TARGET_LABEL: Record<string, string> = { blog: 'Blog post', course: 'Course', module: 'Lesson' };

function repliersLabel(r: ActivityReplies): string {
  const shown = r.users.slice(0, 2).map((u) => u.name);
  const rest = r.count - shown.length;
  if (rest > 0) {
    return `Replies from ${shown.join(', ')} and ${rest} other${rest === 1 ? '' : 's'}`;
  }
  if (shown.length === 2) return `Replies from ${shown[0]} and ${shown[1]}`;
  return `Replies from ${shown[0] ?? 'others'}`;
}

function timeAgo(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}

export default function ProfileView({
  initialMe,
  counts,
  initialReplies,
}: {
  initialMe: ProfileMe;
  counts: ProfileCounts;
  initialReplies: ActivityCommentPage;
}): React.JSX.Element {
  const [me, setMe] = useState(initialMe);
  const [toast, setToast] = useState<string | null>(null);

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [editingHandle, setEditingHandle] = useState(false);
  const [handleDraft, setHandleDraft] = useState(me.username);
  const [savingHandle, setSavingHandle] = useState(false);
  const [handleError, setHandleError] = useState<string | null>(null);

  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState(me.bio ?? '');
  const [savingBio, setSavingBio] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  const [tab, setTab] = useState<ActivityTab>('reply');
  const [pages, setPages] = useState<Record<ActivityTab, ActivityCommentPage | null>>({
    reply: initialReplies,
    post: null,
    course: null,
  });
  const [loading, setLoading] = useState<ActivityTab | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const loadFirst = useCallback(async (t: ActivityTab) => {
    setLoading(t);
    setFeedError(null);
    try {
      const page = await fetchMyComments(t);
      setPages((prev) => ({ ...prev, [t]: page }));
    } catch {
      setFeedError('Could not load activity. Try again.');
    } finally {
      setLoading(null);
    }
  }, []);

  const loadMore = useCallback(
    async (t: ActivityTab) => {
      const current = pages[t];
      if (!current?.nextCursor || loading) return;
      setLoading(t);
      setFeedError(null);
      try {
        const next = await fetchMyComments(t, current.nextCursor);
        setPages((prev) => {
          const base = prev[t];
          return {
            ...prev,
            [t]: { items: [...(base?.items ?? []), ...next.items], nextCursor: next.nextCursor },
          };
        });
      } catch {
        setFeedError('Could not load more. Try again.');
      } finally {
        setLoading(null);
      }
    },
    [pages, loading],
  );

  function selectTab(t: ActivityTab): void {
    setTab(t);
    setFeedError(null);
    if (!pages[t] && loading !== t) void loadFirst(t);
  }

  // Infinite scroll: fetch the next page when the sentinel scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const current = pages[tab];
    if (!current?.nextCursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore(tab);
      },
      { rootMargin: '240px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [tab, pages, loadMore]);

  async function saveAvatar(url: string): Promise<void> {
    setSavingAvatar(true);
    setAvatarError(null);
    const { me: updated, error } = await updateProfile({ avatarUrl: url });
    setSavingAvatar(false);
    if (error || !updated) {
      setAvatarError(error ?? 'Could not update avatar');
      return;
    }
    setMe(updated);
    setAvatarOpen(false);
    setToast('Avatar updated');
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavingAvatar(true);
    setAvatarError(null);
    try {
      const url = await uploadToBunny(file, `avatars/${me.id}`);
      await saveAvatar(url);
    } catch (err) {
      setSavingAvatar(false);
      setAvatarError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function saveBio(): Promise<void> {
    const next = bioDraft.trim();
    if (next === (me.bio ?? '')) {
      setEditingBio(false);
      return;
    }
    setSavingBio(true);
    setBioError(null);
    const { me: updated, error } = await updateProfile({ bio: next });
    setSavingBio(false);
    if (error || !updated) {
      setBioError(error ?? 'Could not update About');
      return;
    }
    setMe(updated);
    setEditingBio(false);
    setToast('About updated');
  }

  async function saveHandle(): Promise<void> {
    const next = handleDraft.trim().toLowerCase();
    if (!HANDLE_RE.test(next)) {
      setHandleError('3 to 20 lowercase letters, numbers or underscores.');
      return;
    }
    if (next === me.username) {
      setEditingHandle(false);
      return;
    }
    setSavingHandle(true);
    setHandleError(null);
    const { me: updated, error } = await updateProfile({ username: next });
    setSavingHandle(false);
    if (error || !updated) {
      setHandleError(error ?? 'Could not update handle');
      return;
    }
    setMe(updated);
    setEditingHandle(false);
    setToast('Handle updated');
  }

  const activePage = pages[tab];
  const items = activePage?.items ?? [];
  const busy = loading === tab;

  return (
    <main className={styles.page}>
      <header className={styles.identity}>
        <div className={styles.avatarBlock}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={me.avatarUrl ?? PRESET_AVATARS[0]} alt="" className={styles.avatar} />
          <button type="button" className={styles.avatarChange} onClick={() => setAvatarOpen((o) => !o)}>
            {avatarOpen ? 'Close' : 'Change'}
          </button>
        </div>

        <div className={styles.identityMain}>
          <h1 className={styles.name}>{me.fullName || me.username}</h1>

          <div className={styles.handleRow}>
            {!editingHandle ? (
              <>
                <span className={styles.handle}>@{me.username}</span>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => {
                    setEditingHandle(true);
                    setHandleDraft(me.username);
                    setHandleError(null);
                  }}
                >
                  Edit
                </button>
              </>
            ) : (
              <>
                <span className={styles.at}>@</span>
                <input
                  className={styles.handleInput}
                  value={handleDraft}
                  maxLength={20}
                  autoFocus
                  aria-label="New handle"
                  onChange={(e) => setHandleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void saveHandle();
                    if (e.key === 'Escape') setEditingHandle(false);
                  }}
                />
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => void saveHandle()}
                  disabled={savingHandle}
                >
                  {savingHandle ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => {
                    setEditingHandle(false);
                    setHandleError(null);
                  }}
                  disabled={savingHandle}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
          {handleError && <p className={styles.err}>{handleError}</p>}

          <dl className={styles.meta}>
            <div>
              <dt>Email</dt>
              <dd>{me.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{roleLabel(me.role)}</dd>
            </div>
          </dl>

          <div className={styles.about}>
            <div className={styles.aboutHead}>
              <span className={styles.aboutLabel}>About</span>
              {!editingBio && (
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => {
                    setEditingBio(true);
                    setBioDraft(me.bio ?? '');
                    setBioError(null);
                  }}
                >
                  {me.bio ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            {editingBio ? (
              <>
                <textarea
                  className={styles.bioInput}
                  value={bioDraft}
                  maxLength={500}
                  rows={3}
                  autoFocus
                  aria-label="About you"
                  placeholder="A sentence or two about you."
                  onChange={(e) => setBioDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setEditingBio(false);
                  }}
                />
                <div className={styles.bioActions}>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => void saveBio()}
                    disabled={savingBio}
                  >
                    {savingBio ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => {
                      setEditingBio(false);
                      setBioError(null);
                    }}
                    disabled={savingBio}
                  >
                    Cancel
                  </button>
                  <span className={styles.bioCount}>{bioDraft.length}/500</span>
                </div>
              </>
            ) : me.bio ? (
              <p className={styles.bioText}>{me.bio}</p>
            ) : (
              <p className={styles.bioEmpty}>No About yet.</p>
            )}
            {bioError && <p className={styles.err}>{bioError}</p>}
          </div>
        </div>

        {toast && <p className={styles.toast}>{toast}</p>}
      </header>

      {avatarOpen && (
        <section className={styles.avatarPicker} aria-label="Choose an avatar">
          <div className={styles.presetGrid}>
            {PRESET_AVATARS.map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.presetBtn} ${me.avatarUrl === p ? styles.presetActive : ''}`}
                onClick={() => void saveAvatar(p)}
                disabled={savingAvatar}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" />
              </button>
            ))}
          </div>
          <div className={styles.uploadRow}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => fileRef.current?.click()}
              disabled={savingAvatar}
            >
              {savingAvatar ? 'Working…' : 'Upload an image'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void handleUpload(e)} />
          </div>
          {avatarError && <p className={styles.err}>{avatarError}</p>}
        </section>
      )}

      <section className={styles.activity}>
        <div className={styles.tabs} role="tablist" aria-label="Activity">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'reply'}
            className={`${styles.tab} ${tab === 'reply' ? styles.tabActive : ''}`}
            onClick={() => selectTab('reply')}
          >
            Blog replies <span className={styles.tabCount}>{counts.blogReplies}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'post'}
            className={`${styles.tab} ${tab === 'post' ? styles.tabActive : ''}`}
            onClick={() => selectTab('post')}
          >
            Blog posts <span className={styles.tabCount}>{counts.blogPosts}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'course'}
            className={`${styles.tab} ${tab === 'course' ? styles.tabActive : ''}`}
            onClick={() => selectTab('course')}
          >
            Courses <span className={styles.tabCount}>{counts.courseComments}</span>
          </button>
        </div>

        {items.length === 0 && !busy ? (
          <p className={styles.empty}>
            {tab === 'reply'
              ? 'No blog replies yet.'
              : tab === 'post'
                ? 'No blog posts yet.'
                : 'No course discussion yet.'}{' '}
            Join a discussion on a course or a blog post.
          </p>
        ) : (
          <ul className={styles.feed}>
            {items.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </ul>
        )}

        {feedError && <p className={styles.err}>{feedError}</p>}

        <div ref={sentinelRef} className={styles.sentinel}>
          {busy && <span className={styles.loadingNote}>Loading…</span>}
          {!busy && activePage?.nextCursor && (
            <button type="button" className={styles.secondaryBtn} onClick={() => void loadMore(tab)}>
              Load more
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function ActivityRow({ item }: { item: ActivityComment }): React.JSX.Element {
  const href = item.target ? `${item.target.href}#comment-${item.id}` : null;

  const inner = (
    <>
      <div className={styles.rowHead}>
        {item.target && <span className={styles.targetType}>{TARGET_LABEL[item.target.type]}</span>}
        <span className={styles.targetTitle}>{item.target?.title ?? 'Discussion'}</span>
        {item.target?.authorName && (
          <span className={styles.targetAuthor}>by {item.target.authorName}</span>
        )}
        <span className={styles.when} suppressHydrationWarning>
          {timeAgo(item.createdAt)}
        </span>
      </div>

      {item.parent && (
        <div className={styles.parentQuote}>
          <span className={styles.parentAuthor}>{item.parent.authorName}</span>
          <span className={styles.parentExcerpt}>{item.parent.excerpt}</span>
        </div>
      )}

      <p className={styles.body}>{item.body}</p>

      <div className={styles.voteRow}>
        <span className={`${styles.voteStat} ${styles.voteUp}`}>
          <span className={styles.voteArrow} aria-hidden>
            ▲
          </span>
          {item.upvoteCount}
        </span>
        <span className={styles.score}>{item.score}</span>
        <span className={`${styles.voteStat} ${styles.voteDown}`}>
          <span className={styles.voteArrow} aria-hidden>
            ▼
          </span>
          {item.downvoteCount}
        </span>
      </div>

      {item.repliers && item.repliers.count > 0 && (
        <div className={styles.repliers}>
          <span className={styles.repliersAvatars}>
            {item.repliers.users.slice(0, 3).map((u) =>
              u.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u.id} src={u.avatarUrl} alt="" className={styles.replierAvatar} />
              ) : (
                <span key={u.id} className={styles.replierAvatar} aria-hidden>
                  {u.name.slice(0, 1).toUpperCase()}
                </span>
              ),
            )}
          </span>
          <span className={styles.repliersText}>{repliersLabel(item.repliers)}</span>
        </div>
      )}
    </>
  );

  return (
    <li className={styles.feedItem}>
      {href ? (
        <Link href={href} className={styles.feedLink}>
          {inner}
        </Link>
      ) : (
        <div className={styles.feedLink}>{inner}</div>
      )}
    </li>
  );
}

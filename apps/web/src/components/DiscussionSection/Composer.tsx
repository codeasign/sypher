'use client';

import { useEffect, useRef, useState } from 'react';
import { searchMentions, type MentionCandidateData } from '@/data/comments';
import styles from './styles.module.css';

interface ComposerProps {
  placeholder: string;
  submitLabel: string;
  cancelLabel?: string;
  /** Prefill for edit-in-place. */
  initialBody?: string;
  /**
   * Tracked mention usernames already present in initialBody (edit case) —
   * they stay "selected" so resubmitting keeps their CommentMention rows.
   */
  initialMentionUsernames?: string[];
  autoFocus?: boolean;
  compact?: boolean;
  onSubmit: (body: string, mentionedUserIds: string[]) => Promise<{ error: string | null }>;
  onCancel?: () => void;
}

// Matches an @token at the caret: start-of-text or whitespace, then "@",
// then the handle chars typed so far. Only THIS shape opens autocomplete —
// "@text" mid-word or after punctuation is ordinary typing.
const MENTION_TRIGGER_RE = /(^|\s)@([a-z0-9_]*)$/i;

/**
 * Comment composer with @mention autocomplete (spec §11). Selections are
 * tracked by userId; on submit only selections whose @username still
 * appears in the final text are sent — free-typed "@whatever" that never
 * went through the dropdown never becomes a tracked mention.
 */
export default function Composer({
  placeholder,
  submitLabel,
  cancelLabel = 'Cancel',
  initialBody = '',
  initialMentionUsernames = [],
  autoFocus = false,
  compact = false,
  onSubmit,
  onCancel,
}: ComposerProps): React.JSX.Element {
  const [value, setValue] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [candidates, setCandidates] = useState<MentionCandidateData[]>([]);
  const [mentionActive, setMentionActive] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // username -> userId for every dropdown selection made in this session
  // of the composer; pre-seeded from initialMentionUsernames' handles via a
  // lookup done once on mount (edit case).
  const selectedMentions = useRef(new Map<string, string>());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function seedInitial(): Promise<void> {
      if (initialMentionUsernames.length === 0) return;
      // Resolve each preexisting handle to its real user id so edits keep
      // the mention rows stable even though this composer session never
      // saw those dropdown selections itself.
      const resolved = await Promise.all(
        initialMentionUsernames.map(async (username) => {
          const matches = await searchMentions(username);
          return matches.find((m) => m.username === username) ?? null;
        }),
      );
      if (cancelled) return;
      resolved.forEach((m) => {
        if (m) selectedMentions.current.set(m.username, m.id);
      });
    }
    void seedInitial();
    return () => {
      cancelled = true;
    };
    // Run once per mount — initial values are props set by the parent when
    // opening the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function caretToken(text: string, caret: number): { matchStart: number; query: string } | null {
    const before = text.slice(0, caret);
    const match = MENTION_TRIGGER_RE.exec(before);
    if (!match || match[2].length === 0) return null;
    return { matchStart: caret - match[2].length - 1, query: match[2].toLowerCase() };
  }

  function handleChange(next: string): void {
    setValue(next);
    setError(null);
    const caret = textareaRef.current?.selectionStart ?? next.length;
    const token = caretToken(next, caret);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!token) {
      setDropdownOpen(false);
      setCandidates([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const items = await searchMentions(token.query);
      setCandidates(items.slice(0, 6));
      setMentionActive(0);
      setDropdownOpen(items.length > 0);
    }, 150);
  }

  function insertSelection(candidate: MentionCandidateData): void {
    const caret = textareaRef.current?.selectionStart ?? value.length;
    const token = caretToken(value, caret);
    if (!token) return;
    const before = value.slice(0, token.matchStart);
    const after = value.slice(caret);
    setValue(`${before}@${candidate.username} ${after}`);
    selectedMentions.current.set(candidate.username, candidate.id);
    setDropdownOpen(false);
    setCandidates([]);
    requestAnimationFrame(() => {
      const pos = token.matchStart + candidate.username.length + 2;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (!dropdownOpen || candidates.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setMentionActive((i) => (i + 1) % candidates.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setMentionActive((i) => (i - 1 + candidates.length) % candidates.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      void insertSelection(candidates[mentionActive]);
    } else if (event.key === 'Escape') {
      setDropdownOpen(false);
    }
  }

  async function handleSubmit(): Promise<void> {
    if (pending) return;
    const text = value.trim();
    if (!text) return;

    // Only selections whose handle survived editing become mention rows.
    const mentionedUserIds: string[] = [];
    selectedMentions.current.forEach((userId, username) => {
      if (new RegExp(`(^|\\s|[^a-z0-9_])@${username}(\\s|$|[^a-z0-9_])`, 'i').test(text)) {
        mentionedUserIds.push(userId);
      }
    });

    setPending(true);
    setError(null);
    const result = await onSubmit(text, mentionedUserIds);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setValue('');
    selectedMentions.current.clear();
    setDropdownOpen(false);
  }

  return (
    <div className={compact ? styles.composerCompact : styles.composer}>
      <div className={styles.composerBox}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={compact ? 2 : 3}
          maxLength={5000}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {dropdownOpen && candidates.length > 0 && (
          <ul className={styles.mentionDropdown} role="listbox" aria-label="Mention suggestions">
            {candidates.map((candidate, index) => (
              <li key={candidate.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === mentionActive}
                  className={`${styles.mentionOption} ${index === mentionActive ? styles.mentionOptionActive : ''}`}
                  onMouseEnter={() => setMentionActive(index)}
                  onClick={() => void insertSelection(candidate)}
                >
                  <span className={styles.avatarSmall}>{initialsOf(candidate.fullName, candidate.username)}</span>
                  <span className={styles.mentionUsername}>@{candidate.username}</span>
                  {candidate.fullName && <span className={styles.mentionFullName}>{candidate.fullName}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className={styles.composerError}>{error}</p>}
      <div className={styles.composerActions}>
        {onCancel && (
          <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </button>
        )}
        <button type="button" className={styles.submitButton} onClick={() => void handleSubmit()} disabled={pending || value.trim().length === 0}>
          {pending ? 'Posting…' : submitLabel}
        </button>
      </div>
    </div>
  );
}

export function initialsOf(fullName: string | null, username: string): string {
  const source = fullName?.trim() || username;
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

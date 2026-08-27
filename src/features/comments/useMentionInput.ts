import { useCallback, useMemo, useState, type RefObject } from "react";
import { useMentionCandidates, type MentionCandidate } from "./useMentionCandidates";

/** Find an in-progress `@query` immediately before the caret. */
export function findMentionQuery(
  text: string,
  caret: number,
): { start: number; query: string } | null {
  const prefix = text.slice(0, caret);
  const at = prefix.lastIndexOf("@");
  if (at === -1) return null;
  const before = at === 0 ? "" : prefix[at - 1];
  if (before && !/\s|\(/.test(before)) return null;
  const query = prefix.slice(at + 1);
  if (query.length > 30 || /[\n\]()]/.test(query)) return null;
  return { start: at, query };
}

/** Mention autocomplete state for a textarea-backed composer. */
export function useMentionInput({
  projectId,
  body,
  setBody,
  textareaRef,
}: {
  projectId?: string;
  body: string;
  setBody: (v: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
}) {
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const candidates = useMentionCandidates(projectId);

  const suggestions = useMemo<MentionCandidate[]>(() => {
    if (!mention) return [];
    const q = mention.query.trim().toLowerCase();
    return candidates.filter((c) => (q ? c.name.toLowerCase().includes(q) : true)).slice(0, 8);
  }, [mention, candidates]);

  const syncMention = useCallback((value: string, caret: number) => {
    setMention(findMentionQuery(value, caret));
    setActiveIndex(0);
  }, []);

  const insertMention = useCallback(
    (m: MentionCandidate) => {
      if (!mention) return;
      const el = textareaRef.current;
      const caret = el?.selectionStart ?? body.length;
      const token = `@[${m.name}](mention:${m.id}) `;
      setBody(body.slice(0, mention.start) + token + body.slice(caret));
      setMention(null);
      requestAnimationFrame(() => {
        const pos = mention.start + token.length;
        el?.focus();
        el?.setSelectionRange(pos, pos);
      });
    },
    [mention, body, setBody, textareaRef],
  );

  const menuOpen = !!mention && suggestions.length > 0;

  /** Handles arrow/enter/tab/escape while the mention menu is open. Returns true when handled. */
  const handleKeyDown = (e: React.KeyboardEvent): boolean => {
    if (!menuOpen) return false;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(suggestions[activeIndex]);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setMention(null);
      return true;
    }
    return false;
  };

  return {
    suggestions,
    activeIndex,
    menuOpen,
    syncMention,
    insertMention,
    closeMention: () => setMention(null),
    handleKeyDown,
  };
}

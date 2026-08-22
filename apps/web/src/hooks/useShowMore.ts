import { useState } from 'react';

const PAGE_SIZE = 4;

export function useShowMore<T>(items: T[]): { visible: T[]; hasMore: boolean; showAll: () => void } {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, PAGE_SIZE);
  return { visible, hasMore: !expanded && items.length > PAGE_SIZE, showAll: () => setExpanded(true) };
}

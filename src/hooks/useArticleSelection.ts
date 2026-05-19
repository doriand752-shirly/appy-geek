import { useCallback, useState } from 'react';

export function useArticleSelection() {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const enterSelection = useCallback((articleId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([articleId]));
  }, []);

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((articleId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) next.delete(articleId);
      else next.add(articleId);
      return next;
    });
  }, []);

  const isSelected = useCallback((articleId: string) => selectedIds.has(articleId), [selectedIds]);

  return {
    selectionMode,
    selectedIds,
    selectedCount: selectedIds.size,
    enterSelection,
    exitSelection,
    toggleSelect,
    isSelected,
  };
}

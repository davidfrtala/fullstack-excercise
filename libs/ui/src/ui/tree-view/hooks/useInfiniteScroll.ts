import React from 'react';
import type { VirtualItem } from '@tanstack/react-virtual';
import type { TreeDataItem, FlattenedTreeItem } from '../types';

export function useInfiniteScroll(
  flattenedTree: FlattenedTreeItem[],
  expandedSetState: Set<string>,
  virtualizer: {
    getVirtualItems: () => VirtualItem[];
  },
  onLoadMore?: (item: TreeDataItem) => void
) {
  // Track which nodes we've already triggered loading for to avoid duplicates
  const loadingTriggeredRef = React.useRef<Set<string>>(new Set());

  // Simplified infinite scroll: check if we're near the end and load more if needed
  const checkAndLoadMore = React.useCallback(() => {
    if (!onLoadMore) return;

    const visibleItems = virtualizer.getVirtualItems();
    const totalCount = flattenedTree.length;

    // Check if we're near the end (within 20 items or in last 30%)
    if (visibleItems.length === 0 || totalCount === 0) return;

    const lastIndex = visibleItems[visibleItems.length - 1]?.index ?? -1;
    const itemsFromEnd = totalCount - lastIndex - 1;
    const isNearEnd =
      itemsFromEnd <= 20 || (totalCount - lastIndex) / totalCount <= 0.3;

    if (!isNearEnd) return;

    // Find any expanded node with more children near the bottom
    const bottomItems = visibleItems.slice(-10); // Check last 10 visible items

    for (const virtualItem of bottomItems) {
      const flattenedItem = flattenedTree[virtualItem.index];
      if (!flattenedItem) continue;

      const item = flattenedItem.item;
      const parentId = flattenedItem.parentId;

      // Check parent node first (most common case)
      if (parentId) {
        const parentFlattened = flattenedTree.find(
          (ft) => ft.item.id === parentId
        );
        if (parentFlattened) {
          const parent = parentFlattened.item;
          if (
            expandedSetState.has(parentId) &&
            parent._hasMoreChildren &&
            !parent._isLoadingChildren &&
            !loadingTriggeredRef.current.has(parentId)
          ) {
            loadingTriggeredRef.current.add(parentId);
            onLoadMore(parent);
            setTimeout(
              () => loadingTriggeredRef.current.delete(parentId),
              2000
            );
            return;
          }
        }
      }

      // Check item itself if expanded
      if (
        expandedSetState.has(item.id) &&
        item._hasMoreChildren &&
        !item._isLoadingChildren &&
        !loadingTriggeredRef.current.has(item.id)
      ) {
        loadingTriggeredRef.current.add(item.id);
        onLoadMore(item);
        setTimeout(() => loadingTriggeredRef.current.delete(item.id), 2000);
        return;
      }
    }
  }, [flattenedTree, expandedSetState, virtualizer, onLoadMore]);

  // Check for infinite scroll on mount, data changes, and periodically
  React.useEffect(() => {
    if (!onLoadMore) return;

    checkAndLoadMore();

    // Periodic check as fallback (every 500ms)
    const intervalId = setInterval(checkAndLoadMore, 500);

    return () => clearInterval(intervalId);
  }, [flattenedTree.length, checkAndLoadMore, onLoadMore]);
}

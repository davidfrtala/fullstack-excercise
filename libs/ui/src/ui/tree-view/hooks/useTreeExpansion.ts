import React from 'react';
import type { TreeDataItem } from '../types';
import { getExpandedPathToItem, findItem } from '../utils/treeUtils';

export function useTreeExpansion(
  data: TreeDataItem[] | TreeDataItem,
  initialSelectedItemId?: string,
  expandAll?: boolean,
  expandedNodes?: Set<string> | string[],
  onExpandedChange?: (
    item: TreeDataItem | undefined,
    isExpanded: boolean
  ) => void
) {
  // Calculate initial expanded item IDs based on selected item
  const expandedItemIds = React.useMemo(() => {
    if (!initialSelectedItemId) {
      return [] as string[];
    }
    return getExpandedPathToItem(data, initialSelectedItemId, expandAll);
  }, [data, expandAll, initialSelectedItemId]);

  // Create expandedSet for O(1) lookups
  // Use external expandedNodes if provided (from Jotai), otherwise derive from initialSelectedItemId
  const expandedSet = React.useMemo(() => {
    if (expandedNodes) {
      // Convert array to Set if needed
      return expandedNodes instanceof Set
        ? expandedNodes
        : new Set(expandedNodes);
    }
    return new Set(expandedItemIds);
  }, [expandedNodes, expandedItemIds]);

  // Track expanded state for lazy loading
  // Use external state if provided, otherwise manage internally
  const [expandedSetState, setExpandedSetState] =
    React.useState<Set<string>>(expandedSet);

  // Sync expandedSetState when external expandedNodes or expandedItemIds changes
  React.useEffect(() => {
    setExpandedSetState(expandedSet);
  }, [expandedSet]);

  const handleExpandedChange = React.useCallback(
    (itemId: string, isExpanded: boolean) => {
      setExpandedSetState((prev) => {
        const next = new Set(prev);
        if (isExpanded) {
          next.add(itemId);
        } else {
          next.delete(itemId);
        }
        return next;
      });

      // Call external handler if provided (for lazy loading)
      if (onExpandedChange) {
        const item = findItem(data, itemId);
        onExpandedChange(item, isExpanded);
      }
    },
    [onExpandedChange, data]
  );

  return {
    expandedItemIds,
    expandedSet,
    expandedSetState,
    handleExpandedChange,
  };
}

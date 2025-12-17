import React from 'react';
import type { FlattenedTreeItem, TreeDataItem } from '../types';

export type KeyboardNavigationHandlers = {
  onKeyDown: (
    e: React.KeyboardEvent,
    item: TreeDataItem,
    index: number
  ) => void;
  focusedItemId: string | undefined;
  setFocusedItemId: (id: string | undefined) => void;
};

export function useTreeKeyboardNavigation(
  flattenedTree: FlattenedTreeItem[],
  expandedSet: Set<string>,
  selectedItemId: string | undefined,
  onSelectChange: (item: TreeDataItem | undefined) => void,
  onExpandedChange?: (itemId: string, isExpanded: boolean) => void
): KeyboardNavigationHandlers {
  const [focusedItemId, setFocusedItemId] = React.useState<string | undefined>(
    selectedItemId
  );

  // Sync focused item with selected item, or set to first item if none selected
  React.useEffect(() => {
    if (selectedItemId) {
      setFocusedItemId(selectedItemId);
    } else if (flattenedTree.length > 0 && !focusedItemId) {
      // Set focus to first item on mount if nothing is selected
      setFocusedItemId(flattenedTree[0].item.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId]);

  const findItemIndex = React.useCallback(
    (itemId: string) => {
      return flattenedTree.findIndex((ft) => ft.item.id === itemId);
    },
    [flattenedTree]
  );

  const findNextVisibleItem = React.useCallback(
    (currentIndex: number, direction: 'up' | 'down'): number | null => {
      if (direction === 'down') {
        for (let i = currentIndex + 1; i < flattenedTree.length; i++) {
          return i;
        }
      } else {
        for (let i = currentIndex - 1; i >= 0; i--) {
          return i;
        }
      }
      return null;
    },
    [flattenedTree]
  );

  const findFirstChild = React.useCallback(
    (parentId: string): number | null => {
      const parentIndex = findItemIndex(parentId);
      if (parentIndex === -1) return null;

      // Find first child (next item with parentId matching)
      for (let i = parentIndex + 1; i < flattenedTree.length; i++) {
        if (flattenedTree[i].parentId === parentId) {
          return i;
        }
        // If we hit an item at the same or lower level, we've passed all children
        if (flattenedTree[i].level <= flattenedTree[parentIndex].level) {
          break;
        }
      }
      return null;
    },
    [flattenedTree, findItemIndex]
  );

  const findParent = React.useCallback(
    (itemId: string): number | null => {
      const currentIndex = findItemIndex(itemId);
      if (currentIndex === -1) return null;

      const current = flattenedTree[currentIndex];
      if (!current.parentId) return null;

      // Find parent by going backwards and finding item with matching id
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (flattenedTree[i].item.id === current.parentId) {
          return i;
        }
      }
      return null;
    },
    [flattenedTree, findItemIndex]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent, item: TreeDataItem, index: number) => {
      const currentIndex = index;
      const currentItem = flattenedTree[currentIndex];
      if (!currentItem) return;

      let targetIndex: number | null = null;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          targetIndex = findNextVisibleItem(currentIndex, 'down');
          break;
        }

        case 'ArrowUp': {
          e.preventDefault();
          targetIndex = findNextVisibleItem(currentIndex, 'up');
          break;
        }

        case 'ArrowRight': {
          e.preventDefault();
          const hasChildren =
            !!item.children?.length || item._hasChildren === true;
          const isExpanded = expandedSet.has(item.id);

          if (hasChildren && !isExpanded) {
            // Expand the node
            onExpandedChange?.(item.id, true);
          } else if (hasChildren && isExpanded) {
            // Move to first child
            targetIndex = findFirstChild(item.id);
          }
          break;
        }

        case 'ArrowLeft': {
          e.preventDefault();
          const hasChildren =
            !!item.children?.length || item._hasChildren === true;
          const isExpanded = expandedSet.has(item.id);

          if (hasChildren && isExpanded) {
            // Collapse the node
            onExpandedChange?.(item.id, false);
          } else {
            // Move to parent
            targetIndex = findParent(item.id);
          }
          break;
        }

        case 'Enter':
        case ' ': {
          e.preventDefault();
          onSelectChange(item);
          item.onClick?.();
          break;
        }

        case 'Home': {
          e.preventDefault();
          targetIndex = 0;
          break;
        }

        case 'End': {
          e.preventDefault();
          targetIndex = flattenedTree.length - 1;
          break;
        }

        default:
          return;
      }

      // Move focus to target item
      if (
        targetIndex !== null &&
        targetIndex >= 0 &&
        targetIndex < flattenedTree.length
      ) {
        const targetItem = flattenedTree[targetIndex];
        setFocusedItemId(targetItem.item.id);
        // Focus will be handled by the component's useEffect
      }
    },
    [
      flattenedTree,
      expandedSet,
      findNextVisibleItem,
      findFirstChild,
      findParent,
      onSelectChange,
      onExpandedChange,
    ]
  );

  return {
    onKeyDown: handleKeyDown,
    focusedItemId,
    setFocusedItemId,
  };
}

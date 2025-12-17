import React from 'react';
import type { TreeDataItem, FlattenedTreeItem } from '../types';

/**
 * Hook to flatten tree into visible items only (respects expanded state)
 */
export function useFlattenedTree(
  data: TreeDataItem[] | TreeDataItem,
  expandedSet: Set<string>
): FlattenedTreeItem[] {
  return React.useMemo(() => {
    const flattened: FlattenedTreeItem[] = [];
    let index = 0;

    function walkTree(
      items: TreeDataItem[] | TreeDataItem,
      level: number,
      parentId?: string
    ) {
      const itemsArray = Array.isArray(items) ? items : [items];

      for (const item of itemsArray) {
        flattened.push({
          item,
          level,
          parentId,
          index: index++,
        });

        // Only walk children if this node is expanded
        if (
          item.children &&
          item.children.length > 0 &&
          expandedSet.has(item.id)
        ) {
          walkTree(item.children, level + 1, item.id);
        }
      }
    }

    walkTree(data, 0);
    return flattened;
  }, [data, expandedSet]);
}

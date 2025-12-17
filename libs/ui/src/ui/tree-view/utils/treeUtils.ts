import type { TreeDataItem } from '../types';

/**
 * Finds an item in the tree by its ID
 */
export function findItem(
  items: TreeDataItem[] | TreeDataItem,
  id: string
): TreeDataItem | undefined {
  const itemsArray = Array.isArray(items) ? items : [items];
  for (const item of itemsArray) {
    if (item.id === id) {
      return item;
    }
    if (item.children) {
      const found = findItem(item.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Walks the tree to find the path to a target item ID
 * Returns an array of IDs that should be expanded to reach the target
 */
export function getExpandedPathToItem(
  items: TreeDataItem[] | TreeDataItem,
  targetId: string,
  expandAll = false
): string[] {
  const ids: string[] = [];

  function walkTreeItems(
    items: TreeDataItem[] | TreeDataItem,
    targetId: string
  ): boolean {
    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        ids.push(items[i].id);
        if (walkTreeItems(items[i], targetId) && !expandAll) {
          return true;
        }
        if (!expandAll) ids.pop();
      }
      return false;
    } else if (!expandAll && items.id === targetId) {
      return true;
    } else if (items.children) {
      return walkTreeItems(items.children, targetId);
    }
    return false;
  }

  walkTreeItems(items, targetId);
  return ids;
}

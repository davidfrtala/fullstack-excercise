import type { TreeDataItem } from '@homework/ui/tree-view';
import type { TreeNodeData } from '../services/treeApi';

/**
 * Builds a tree from a flat array of TreeNodeData elements.
 *
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 * @param entries - The array of parsed entries
 * @returns Array containing the root node of the tree in TreeDataItem format (or empty array)
 */
export function buildTree(entries: TreeNodeData[]): TreeDataItem[] {
  if (entries.length === 0) {
    return [];
  }

  // Map to track nodes by their hash (handles duplicates by using the first occurrence, altough we cleaned the data on server)
  const nodeMap = new Map<string, TreeDataItem>();
  let root: TreeDataItem | undefined;

  // First pass: create all nodes
  for (const entry of entries) {
    const node: TreeDataItem = {
      id: entry.hash,
      name: `${entry.name.split(' > ').pop() || entry.name} (${entry.size})`,
      children: [],
      _hasChildren: false,
    };

    nodeMap.set(entry.hash, node);
  }

  // Second pass: link children to parents
  for (const entry of entries) {
    const node = nodeMap.get(entry.hash) as TreeDataItem;

    // If the parent hash is null, this is the root node
    if (entry.parentHash === null) {
      root = node;
      continue;
    }

    // Find parent and add this node as child
    const parent = nodeMap.get(entry.parentHash);
    if (parent) {
      // Initialize children array if needed (should not happen,)
      if (!parent.children) {
        parent.children = [];
      }

      parent.children.push(node);
    } else {
      // This shouldn't happen if data is consistent, but handle gracefully
      console.warn(
        `Parent hash ${entry.parentHash} not found for entry ${entry.hash}`
      );
    }
  }

  // Return array with single root node (or empty array if no root found)
  return root ? [root] : [];
}

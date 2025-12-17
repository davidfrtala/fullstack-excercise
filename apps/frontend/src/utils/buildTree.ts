import { ParsedEntry } from '@homework/server/src/parse';

export interface TreeNode {
  id: string;
  name: string;
  size: number;
  children: TreeNode[];
  hasMore?: boolean; // Pagination: indicates if more children can be loaded
}

/**
 * Builds a tree from a flat array of ParsedEntry elements.
 *
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 * @param entries - The array of parsed entries
 * @returns The root node of the tree
 */
export function buildTree(entries: ParsedEntry[]): TreeNode | null {
  if (entries.length === 0) {
    return null;
  }

  // Map to track nodes by their hash
  const nodeMap = new Map<string, TreeNode>();
  let root: TreeNode | null = null;

  // First pass: create all nodes
  for (const entry of entries) {
    const node: TreeNode = {
      id: entry.hash,
      name: entry.name.split(' > ').pop() || entry.name, // Just the segment name
      size: entry.size,
      children: [],
    };
    nodeMap.set(entry.hash, node);
  }

  // Second pass: link children to parents
  for (const entry of entries) {
    const node = nodeMap.get(entry.hash) as TreeNode;

    // If the parent hash is null, this is the root node
    if (entry.parentHash === null) {
      root = node;
      continue;
    }

    // Find parent and add this node as child
    const parent = nodeMap.get(entry.parentHash);
    if (parent) {
      parent.children.push(node);
    } else {
      // This shouldn't happen if data is consistent, but handle gracefully
      console.warn(
        `Parent hash ${entry.parentHash} not found for entry ${entry.hash}`
      );
    }
  }

  return root;
}

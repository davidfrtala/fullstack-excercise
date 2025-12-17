import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { TreeDataItem } from '@homework/ui/tree-view';
import {
  nodesAtom,
  nodeChildrenAtom,
  expandedNodesAtom,
  nodePaginationAtom,
} from '../store/treeAtoms';

/**
 * Extended TreeDataItem with pagination metadata
 */
export interface ExtendedTreeDataItem extends TreeDataItem {
  /** Whether this node has children (based on size > 0) */
  _hasChildren?: boolean;
  /** Whether there are more children to load (pagination) */
  _hasMoreChildren?: boolean;
  /** Whether children are currently being loaded */
  _isLoadingChildren?: boolean;
}

/**
 * Hook to convert the Jotai atom state to TreeDataItem format for TreeView component
 * This function builds the tree structure lazily based on expanded nodes
 */
export function useTreeDataConverter(
  rootHash: string | null
): ExtendedTreeDataItem[] {
  const nodes = useAtomValue(nodesAtom);
  const childrenMap = useAtomValue(nodeChildrenAtom);
  const expandedSet = useAtomValue(expandedNodesAtom);
  const paginationMap = useAtomValue(nodePaginationAtom);

  return useMemo(() => {
    if (!rootHash) {
      return [];
    }

    const rootNode = nodes.get(rootHash);
    if (!rootNode) {
      return [];
    }

    /**
     * Recursively converts a node and its children to TreeDataItem format
     * Only includes children if the node is expanded
     */
    function convertNode(hash: string): ExtendedTreeDataItem | null {
      const node = nodes.get(hash);
      if (!node) {
        return null;
      }

      const isExpanded = expandedSet.has(hash);
      const childHashes = childrenMap.get(hash) || [];
      const pagination = paginationMap.get(hash);

      // Build children array only if node is expanded
      const children: ExtendedTreeDataItem[] = [];
      if (isExpanded) {
        // Add loaded children
        for (const childHash of childHashes) {
          const childItem = convertNode(childHash);
          if (childItem) {
            children.push(childItem);
          }
        }
      }

      const hasChildren = node.size > 0;
      const hasMoreChildren = pagination?.hasMore ?? false;
      const isLoadingChildren = pagination?.isLoading ?? false;

      const treeItem: ExtendedTreeDataItem = {
        id: node.hash,
        name: `${node.name.split(' > ').pop() || node.name} (${node.size})`, // Just the segment name, size in parentheses
        // Include children array if:
        // 1. Node has children loaded (children.length > 0), OR
        // 2. Node has size > 0 (indicating it has children, even if not loaded yet)
        // This ensures TreeView treats it as a TreeNode (expandable) rather than TreeLeaf
        children:
          children.length > 0 || hasChildren
            ? children.length > 0
              ? children
              : [] // Empty array for nodes with children not yet loaded
            : undefined, // undefined for leaf nodes (size === 0)
        // Metadata for lazy loading
        _hasChildren: hasChildren,
        _hasMoreChildren: hasMoreChildren,
        _isLoadingChildren: isLoadingChildren,
      };

      return treeItem;
    }

    const rootItem = convertNode(rootHash);
    return rootItem ? [rootItem] : [];
  }, [rootHash, nodes, childrenMap, expandedSet, paginationMap]);
}

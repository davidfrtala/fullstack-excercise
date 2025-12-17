import { useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  nodesAtom,
  expandedNodesAtom,
  setNodeExpandedAtom,
  nodePaginationAtom,
  isSearchModeAtom,
} from '../store/treeAtoms';
import { fetchNodeChildren } from '../services/treeApi';
import {
  setNodeAtom,
  setNodeChildrenAtom,
  appendNodeChildrenAtom,
  setNodePaginationAtom,
} from '../store/treeAtoms';
import { TreeDataItem } from '@homework/ui/tree-view';

/**
 * Hook to integrate TreeView component with lazy loading
 * Handles expansion events and triggers child loading
 *
 * This hook manages the connection between TreeView expansion and our lazy loading system.
 * When a node is expanded, it automatically loads its children if they haven't been loaded yet.
 */
export function useTreeViewIntegration(loadMoreSearchResults?: () => void) {
  const nodes = useAtomValue(nodesAtom);
  const expandedSet = useAtomValue(expandedNodesAtom);
  const paginationMap = useAtomValue(nodePaginationAtom);
  const isSearchMode = useAtomValue(isSearchModeAtom);
  const setExpanded = useSetAtom(setNodeExpandedAtom);
  const setNode = useSetAtom(setNodeAtom);
  const setChildren = useSetAtom(setNodeChildrenAtom);
  const appendChildren = useSetAtom(appendNodeChildrenAtom);
  const setPagination = useSetAtom(setNodePaginationAtom);

  /**
   * Loads children for a node
   */
  const loadNodeChildren = useCallback(
    async (hash: string, cursor?: string, limit = 100) => {
      const node = nodes.get(hash);
      if (!node) {
        throw new Error(`Node ${hash} not found`);
      }

      // Check if node has children (size > 0)
      if (node.size === 0) {
        return;
      }

      const pagination = paginationMap.get(hash) || {
        hasMore: false,
        isLoading: false,
        isInitialized: false,
      };

      // Set loading state
      setPagination({
        hash,
        pagination: {
          ...pagination,
          isLoading: true,
        },
      });

      try {
        const response = await fetchNodeChildren(hash, cursor, limit);

        // Store all new nodes
        response.data.forEach((childNode) => {
          setNode(childNode);
        });

        // Extract child hashes in order
        const newChildHashes = response.data.map((child) => child.hash);

        // Update children list
        if (cursor) {
          // Append for pagination
          appendChildren({
            parentHash: hash,
            childrenHashes: newChildHashes,
          });
        } else {
          // Replace for initial load
          setChildren({
            parentHash: hash,
            childrenHashes: newChildHashes,
          });
        }

        // Update pagination state
        setPagination({
          hash,
          pagination: {
            cursor: response.pagination.nextCursor,
            hasMore: response.pagination.hasMore,
            isLoading: false,
            isInitialized: true,
          },
        });
      } catch (error) {
        console.error(`Failed to fetch children for node ${hash}:`, error);
        // Reset loading state on error
        setPagination({
          hash,
          pagination: {
            ...pagination,
            isLoading: false,
          },
        });
        throw error;
      }
    },
    [nodes, paginationMap, setNode, setChildren, appendChildren, setPagination]
  );

  /**
   * Handles when a tree item is expanded or collapsed
   * Triggers lazy loading of children if needed
   */
  const handleExpandedChange = useCallback(
    (item: TreeDataItem | undefined, isExpanded: boolean) => {
      if (!item) return;

      const hash = item.id;
      const node = nodes.get(hash);

      if (!node) {
        console.warn(`Node ${hash} not found in store`);
        return;
      }

      // Update expanded state
      setExpanded({ hash, expanded: isExpanded });

      // If expanding and node has children (size > 0), load them
      if (isExpanded && node.size > 0) {
        const pagination = paginationMap.get(hash);
        // Only load if not already initialized and not currently loading
        if (!pagination?.isInitialized && !pagination?.isLoading) {
          loadNodeChildren(hash).catch((error) => {
            console.error(`Failed to load children for ${hash}:`, error);
          });
        }
      }
    },
    [nodes, paginationMap, setExpanded, loadNodeChildren]
  );

  /**
   * Handles when a tree item is selected
   */
  const handleSelectChange = useCallback((item: TreeDataItem | undefined) => {
    // You can add selection logic here if needed
    if (item) {
      console.log('Selected item:', item);
    }
  }, []);

  /**
   * Handles loading more children when scrolling near bottom (infinite scroll)
   * In search mode, calls loadMoreSearchResults instead of normal pagination
   */
  const handleLoadMore = useCallback(
    (item: TreeDataItem) => {
      // If in search mode, use search pagination
      if (isSearchMode && loadMoreSearchResults) {
        loadMoreSearchResults();
        return;
      }

      // Normal tree pagination
      const hash = item.id;
      const node = nodes.get(hash);

      if (!node) {
        console.warn(`Node ${hash} not found in store`);
        return;
      }

      const pagination = paginationMap.get(hash);

      // Only load more if:
      // 1. Node has more children to load
      // 2. Not currently loading
      // 3. Has a cursor for pagination
      if (pagination?.hasMore && !pagination.isLoading && pagination.cursor) {
        loadNodeChildren(hash, pagination.cursor).catch((error) => {
          console.error(`Failed to load more children for ${hash}:`, error);
        });
      }
    },
    [
      nodes,
      paginationMap,
      loadNodeChildren,
      isSearchMode,
      loadMoreSearchResults,
    ]
  );

  return {
    handleExpandedChange,
    handleSelectChange,
    handleLoadMore,
    expandedNodes: expandedSet,
    loadNodeChildren,
  };
}

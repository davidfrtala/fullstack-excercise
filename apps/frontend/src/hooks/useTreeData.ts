import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';
import {
  nodesAtom,
  rootNodeHashAtom,
  setNodeAtom,
  setNodePaginationAtom,
} from '../store/treeAtoms';

import { fetchRoot } from '../services/treeApi';

/**
 * Hook to initialize and fetch the root node
 */
export function useRootNode() {
  const [rootHash, setRootHash] = useAtom(rootNodeHashAtom);
  const setNode = useSetAtom(setNodeAtom);
  const setPagination = useSetAtom(setNodePaginationAtom);
  const nodes = useAtomValue(nodesAtom);

  const initializeRoot = useCallback(async () => {
    // If root is already loaded, return early
    if (rootHash && nodes.has(rootHash)) {
      return;
    }

    try {
      const response = await fetchRoot();
      const rootNode = response.data;

      // Store root node
      setNode(rootNode);
      setRootHash(rootNode.hash);

      // Initialize pagination state for root
      setPagination({
        hash: rootNode.hash,
        pagination: {
          hasMore: rootNode.size > 0, // Root has children if size > 0
          isLoading: false,
          isInitialized: false,
          cursor: undefined,
        },
      });
    } catch (error) {
      console.error('Failed to fetch root node:', error);
      throw error;
    }
  }, [rootHash, nodes, setNode, setRootHash, setPagination]);

  return {
    rootHash,
    initializeRoot,
    rootNode: rootHash ? nodes.get(rootHash) : undefined,
  };
}

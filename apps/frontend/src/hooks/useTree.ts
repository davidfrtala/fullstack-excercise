import { useEffect } from 'react';
import { useRootNode } from './useTreeData';
import {
  useTreeDataConverter,
  type ExtendedTreeDataItem,
} from '../utils/treeConverter';

/**
 * Main hook for tree management
 * Handles initialization and provides tree data in TreeDataItem format
 */
export function useTree() {
  const { rootHash, initializeRoot, rootNode } = useRootNode();
  const treeData = useTreeDataConverter(rootHash);

  // Initialize root on mount
  useEffect(() => {
    if (!rootHash) {
      initializeRoot().catch((error) => {
        console.error('Failed to initialize root:', error);
      });
    }
  }, [rootHash, initializeRoot]);

  return {
    treeData: treeData as ExtendedTreeDataItem[],
    rootHash,
    rootNode,
    isLoading: !rootHash || !rootNode,
  };
}

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { searchResultsAtom } from '../store/treeAtoms';
import { buildTree } from '../utils/treeBuilder';
import { TreeDataItem } from '@homework/ui/tree-view';

/**
 * Hook to convert search results to TreeDataItem format
 * Uses buildTree to construct the tree structure
 */
export function useSearchTree(): TreeDataItem[] {
  const searchResults = useAtomValue(searchResultsAtom);

  const treeData = useMemo(() => {
    if (searchResults.length === 0) {
      return [];
    }

    return buildTree(searchResults);
  }, [searchResults]);

  return treeData;
}

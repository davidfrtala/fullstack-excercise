import { useMemo, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@homework/ui/card';
import { TreeView } from '@homework/ui/tree-view';
import { Input } from '@homework/ui/input';
import { useAtomValue, useSetAtom } from 'jotai';
import { useTree } from '../hooks/useTree';
import { useTreeViewIntegration } from '../hooks/useTreeViewIntegration';
import { useSearch } from '../hooks/useSearch';
import { useSearchTree } from '../hooks/useSearchTree';
import {
  isSearchModeAtom,
  setMultipleNodesExpandedAtom,
  clearAllExpandedNodesAtom,
} from '../store/treeAtoms';
import { HighlightedText } from '../utils/highlightSearchTerm';
import type { TreeRenderItemParams } from '@homework/ui/tree-view';
// These are not exported from the main tree-view index
import { TreeIcon } from '@homework/ui/tree-view/components/TreeIcon';

export function App() {
  const { treeData, isLoading } = useTree();

  const { searchQuery, setSearchQuery, isSearching, loadMoreSearchResults } =
    useSearch();
  const searchTreeData = useSearchTree();
  const isSearchMode = useAtomValue(isSearchModeAtom);
  const setMultipleExpanded = useSetAtom(setMultipleNodesExpandedAtom);
  const clearAllExpanded = useSetAtom(clearAllExpandedNodesAtom);

  // Track which search results we've already expanded to prevent re-expansion
  const expandedSearchResultsRef = useRef<string>('');
  // Ref to maintain focus on search input
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Track if search input was focused before tree update
  const wasInputFocusedRef = useRef<boolean>(false);
  // Track when search results last updated to distinguish automatic vs manual focus
  const lastSearchUpdateRef = useRef<number>(0);
  // Track if user is actively typing (recent keyboard input)
  const isTypingRef = useRef<boolean>(false);

  const {
    handleExpandedChange,
    handleSelectChange,
    handleLoadMore,
    expandedNodes,
  } = useTreeViewIntegration(loadMoreSearchResults);

  // Auto-expand all nodes in search mode (batched update to prevent flickering)
  useEffect(() => {
    if (isSearchMode && searchTreeData.length > 0) {
      // Create a stable key from the search tree to track if we've already expanded this set
      const treeKey = JSON.stringify(
        searchTreeData.map((node) => node.id).sort()
      );

      // Only expand if this is a new search result set
      if (expandedSearchResultsRef.current !== treeKey) {
        // Collect all node IDs from the search tree (recursively)
        const collectNodeIds = (nodes: typeof searchTreeData): string[] => {
          const ids: string[] = [];
          for (const node of nodes) {
            ids.push(node.id);
            if (node.children && node.children.length > 0) {
              ids.push(...collectNodeIds(node.children));
            }
          }
          return ids;
        };

        const allNodeIds = collectNodeIds(searchTreeData);

        // Batch expand all nodes in a single update to prevent flickering
        if (allNodeIds.length > 0) {
          setMultipleExpanded({ hashes: allNodeIds, expanded: true });
          expandedSearchResultsRef.current = treeKey;
        }
      }
    } else if (!isSearchMode) {
      // Clear the ref when exiting search mode
      expandedSearchResultsRef.current = '';
      // Clear all expanded nodes when exiting search mode
      // This prevents nodes from appearing expanded without their children loaded
      clearAllExpanded();
    }
  }, [isSearchMode, searchTreeData, setMultipleExpanded, clearAllExpanded]);

  // Track when search input is focused and user typing
  useEffect(() => {
    const input = searchInputRef.current;
    if (!input) return;

    const handleFocus = () => {
      wasInputFocusedRef.current = true;
    };

    const handleKeyDown = () => {
      // User is actively typing
      isTypingRef.current = true;
      // Clear typing flag after a delay
      setTimeout(() => {
        isTypingRef.current = false;
      }, 500);
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.relatedTarget as HTMLElement;
      const now = Date.now();
      const timeSinceUpdate = now - lastSearchUpdateRef.current;

      // Only prevent focus if:
      // 1. We're in search mode
      // 2. User was typing (not manually navigating)
      // 3. Focus is moving to tree
      // 4. Search results updated recently (within 500ms) - automatic focus
      if (
        isSearchMode &&
        wasInputFocusedRef.current &&
        isTypingRef.current &&
        timeSinceUpdate < 500 &&
        target &&
        (target.closest('[role="tree"]') || target.closest('[role="treeitem"]'))
      ) {
        e.preventDefault();
        // Restore focus immediately
        setTimeout(() => {
          if (input && document.activeElement !== input) {
            input.focus();
            const length = input.value.length;
            input.setSelectionRange(length, length);
          }
        }, 0);
        return;
      }

      // Clear flags if focus moved away and user wasn't typing
      if (!isTypingRef.current) {
        setTimeout(() => {
          if (document.activeElement !== input) {
            wasInputFocusedRef.current = false;
          }
        }, 0);
      }
    };

    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);
    input.addEventListener('keydown', handleKeyDown);

    return () => {
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
      input.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchMode]);

  // Restore focus to search input after search results update (only if user was typing)
  useEffect(() => {
    if (
      isSearchMode &&
      !isSearching &&
      wasInputFocusedRef.current &&
      isTypingRef.current &&
      searchInputRef.current &&
      searchTreeData.length > 0
    ) {
      // Mark when search results updated
      lastSearchUpdateRef.current = Date.now();

      // Restore focus only if user is actively typing
      const restoreFocus = () => {
        const input = searchInputRef.current;
        if (input && wasInputFocusedRef.current && isTypingRef.current) {
          // Check if something else has focus
          const activeElement = document.activeElement;
          if (activeElement && activeElement !== input) {
            // If a tree item has focus and user is typing, remove it
            if (
              activeElement.closest('[role="tree"]') ||
              activeElement.closest('[role="treeitem"]')
            ) {
              (activeElement as HTMLElement).blur();
            }
          }
          input.focus();
          const length = input.value.length;
          input.setSelectionRange(length, length);
        }
      };

      // Immediate attempt (synchronous)
      restoreFocus();

      // Also try after render cycle
      requestAnimationFrame(() => {
        if (isTypingRef.current) {
          restoreFocus();
          // A couple more attempts to catch late focus changes
          setTimeout(() => {
            if (isTypingRef.current) restoreFocus();
          }, 0);
          setTimeout(() => {
            if (isTypingRef.current) restoreFocus();
          }, 10);
        }
      });
    }
  }, [isSearchMode, searchTreeData, isSearching]);

  // Prevent tree from automatically receiving focus in search mode (only when user is typing)
  useEffect(() => {
    if (!isSearchMode) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const now = Date.now();
      const timeSinceUpdate = now - lastSearchUpdateRef.current;

      // Only prevent if:
      // 1. User is actively typing
      // 2. Search results updated recently (automatic focus)
      // 3. Focus is moving to tree
      if (
        wasInputFocusedRef.current &&
        isTypingRef.current &&
        timeSinceUpdate < 500 &&
        searchInputRef.current &&
        target &&
        (target.closest('[role="tree"]') || target.closest('[role="treeitem"]'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          const length = searchInputRef.current.value.length;
          searchInputRef.current.setSelectionRange(length, length);
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, [isSearchMode]);

  // Determine which tree data to use
  const displayTreeData = isSearchMode ? searchTreeData : treeData;
  const displayIsLoading = isSearchMode ? isSearching : isLoading;

  // Create renderItem function for search mode with highlighting
  const renderItem = useMemo(() => {
    if (!isSearchMode || !searchQuery.trim()) {
      return undefined;
    }

    return (params: TreeRenderItemParams) => {
      const { item } = params;

      return (
        <>
          <TreeIcon item={item} />
          <HighlightedText
            text={item.name}
            searchTerm={searchQuery.trim()}
            className="flex-1 min-w-0 text-sm truncate"
          />
        </>
      );
    };
  }, [isSearchMode, searchQuery]);

  return (
    <div className="flex justify-center items-center p-4 min-h-screen">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>ImageNet Tree</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="search" className="text-sm font-medium">
              Search
            </label>
            <Input
              ref={searchInputRef}
              id="search"
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // Ensure focus flag is set when user is typing
                wasInputFocusedRef.current = true;
              }}
              onFocus={() => {
                wasInputFocusedRef.current = true;
              }}
            />
          </div>
          {displayIsLoading ? (
            <div>Loading tree...</div>
          ) : (
            <div>
              <TreeView
                data={displayTreeData}
                expandedNodes={expandedNodes}
                onExpandedChange={handleExpandedChange}
                onSelectChange={handleSelectChange}
                onLoadMore={handleLoadMore}
                renderItem={renderItem}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default App;

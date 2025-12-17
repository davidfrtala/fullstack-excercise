import { useEffect, useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  searchQueryAtom,
  searchResultsAtom,
  searchPaginationAtom,
} from '../store/treeAtoms';
import { searchEntries } from '../services/treeApi';

/**
 * Hook for managing search functionality
 * Handles debounced search, pagination, and state management
 */
export function useSearch() {
  const searchQuery = useAtomValue(searchQueryAtom);
  const searchResults = useAtomValue(searchResultsAtom);
  const pagination = useAtomValue(searchPaginationAtom);
  const setSearchQuery = useSetAtom(searchQueryAtom);
  const setSearchResults = useSetAtom(searchResultsAtom);
  const setPagination = useSetAtom(searchPaginationAtom);

  /**
   * Performs a search with the given query
   */
  const performSearch = useCallback(
    async (query: string, cursor?: string, append = false) => {
      const trimmedQuery = query.trim();

      // Don't search if query is too short
      if (trimmedQuery.length <= 3) {
        setSearchResults([]);
        setPagination({
          hasMore: false,
          isLoading: false,
        });
        return;
      }

      // Set loading state
      setPagination((prev) => ({
        ...prev,
        isLoading: true,
      }));

      try {
        const response = await searchEntries(trimmedQuery, cursor);

        if (append) {
          // Append results for pagination
          setSearchResults((prev) => [...prev, ...response.data]);
        } else {
          // Replace results for new search
          setSearchResults(response.data);
        }

        // Update pagination state
        setPagination({
          cursor: response.pagination.nextCursor,
          hasMore: response.pagination.hasMore,
          isLoading: false,
        });
      } catch (error) {
        console.error('Search error:', error);
        setPagination((prev) => ({
          ...prev,
          isLoading: false,
        }));
        // Clear results on error
        if (!append) {
          setSearchResults([]);
        }
      }
    },
    [setSearchResults, setPagination]
  );

  // Debounced search effect
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    // Clear results if query is too short
    if (trimmedQuery.length <= 3) {
      setSearchResults([]);
      setPagination({
        hasMore: false,
        isLoading: false,
      });
      return;
    }

    // Debounce search by 300ms
    const timeoutId = setTimeout(() => {
      performSearch(trimmedQuery);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchQuery, performSearch, setSearchResults, setPagination]);

  /**
   * Load more search results (pagination)
   */
  const loadMoreSearchResults = useCallback(() => {
    const trimmedQuery = searchQuery.trim();
    if (
      trimmedQuery.length > 3 &&
      pagination.hasMore &&
      !pagination.isLoading &&
      pagination.cursor
    ) {
      performSearch(trimmedQuery, pagination.cursor, true);
    }
  }, [searchQuery, pagination, performSearch]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching: pagination.isLoading,
    hasMore: pagination.hasMore,
    loadMoreSearchResults,
  };
}

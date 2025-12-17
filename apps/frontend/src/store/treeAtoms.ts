import { atom } from 'jotai';
import type { TreeNodeData } from '../services/treeApi';

/**
 * Pagination state for a node's children
 */
export interface NodePaginationState {
  /** Current cursor for pagination */
  cursor?: string;
  /** Whether there are more children to load */
  hasMore: boolean;
  /** Whether children are currently being loaded */
  isLoading: boolean;
  /** Whether the first page of children has been loaded */
  isInitialized: boolean;
}

/**
 * Atom storing all node data by hash
 * Key: node hash
 * Value: node data
 */
export const nodesAtom = atom<Map<string, TreeNodeData>>(new Map());

/**
 * Atom storing children relationships
 * Key: parent node hash
 * Value: array of child node hashes in order
 */
export const nodeChildrenAtom = atom<Map<string, string[]>>(new Map());

/**
 * Atom storing pagination state for each node
 * Key: node hash
 * Value: pagination state
 */
export const nodePaginationAtom = atom<Map<string, NodePaginationState>>(
  new Map()
);

/**
 * Atom storing expanded node hashes
 * Used to track which nodes are currently expanded in the UI
 */
export const expandedNodesAtom = atom<Set<string>>(new Set<string>());

/**
 * Atom storing the root node hash
 * null if root hasn't been loaded yet
 */
export const rootNodeHashAtom = atom<string | null>(null);

/**
 * Derived atom: Get a specific node by hash
 */
export const getNodeAtom = (hash: string) =>
  atom((get) => get(nodesAtom).get(hash));

/**
 * Derived atom: Get children of a specific node
 */
export const getNodeChildrenAtom = (hash: string) =>
  atom((get) => {
    const childrenHashes = get(nodeChildrenAtom).get(hash) || [];
    const nodes = get(nodesAtom);
    return childrenHashes
      .map((childHash) => nodes.get(childHash))
      .filter((node): node is TreeNodeData => node !== undefined);
  });

/**
 * Derived atom: Get pagination state for a specific node
 */
export const getNodePaginationAtom = (hash: string) =>
  atom((get) => {
    const pagination = get(nodePaginationAtom).get(hash);
    return (
      pagination || {
        hasMore: false,
        isLoading: false,
        isInitialized: false,
      }
    );
  });

/**
 * Derived atom: Check if a node has children (based on size > 0)
 */
export const hasChildrenAtom = (hash: string) =>
  atom((get) => {
    const node = get(nodesAtom).get(hash);
    return node ? node.size > 0 : false;
  });

/**
 * Derived atom: Check if a node is expanded
 */
export const isNodeExpandedAtom = (hash: string) =>
  atom((get) => get(expandedNodesAtom).has(hash));

/**
 * Helper atom to set a node in the nodes map
 */
export const setNodeAtom = atom(null, (get, set, node: TreeNodeData) => {
  const nodes = get(nodesAtom);
  const newNodes = new Map(nodes);
  newNodes.set(node.hash, node);
  set(nodesAtom, newNodes);
});

/**
 * Helper atom to set children for a node
 */
export const setNodeChildrenAtom = atom(
  null,
  (
    get,
    set,
    {
      parentHash,
      childrenHashes,
    }: { parentHash: string; childrenHashes: string[] }
  ) => {
    const children = get(nodeChildrenAtom);
    const newChildren = new Map(children);
    newChildren.set(parentHash, childrenHashes);
    set(nodeChildrenAtom, newChildren);
  }
);

/**
 * Helper atom to append children to a node (for pagination)
 */
export const appendNodeChildrenAtom = atom(
  null,
  (
    get,
    set,
    {
      parentHash,
      childrenHashes,
    }: { parentHash: string; childrenHashes: string[] }
  ) => {
    const children = get(nodeChildrenAtom);
    const newChildren = new Map(children);
    const existing = newChildren.get(parentHash) || [];
    newChildren.set(parentHash, [...existing, ...childrenHashes]);
    set(nodeChildrenAtom, newChildren);
  }
);

/**
 * Helper atom to set pagination state for a node
 */
export const setNodePaginationAtom = atom(
  null,
  (
    get,
    set,
    { hash, pagination }: { hash: string; pagination: NodePaginationState }
  ) => {
    const paginationMap = get(nodePaginationAtom);
    const newPagination = new Map(paginationMap);
    newPagination.set(hash, pagination);
    set(nodePaginationAtom, newPagination);
  }
);

/**
 * Helper atom to set expanded state of a node
 */
export const setNodeExpandedAtom = atom(
  null,
  (get, set, { hash, expanded }: { hash: string; expanded: boolean }) => {
    const expandedSet = get(expandedNodesAtom);
    const newExpanded = new Set(expandedSet);
    if (expanded) {
      newExpanded.add(hash);
    } else {
      newExpanded.delete(hash);
    }
    set(expandedNodesAtom, newExpanded);
  }
);

/**
 * Helper atom to set multiple expanded nodes at once (for batch updates)
 */
export const setMultipleNodesExpandedAtom = atom(
  null,
  (get, set, { hashes, expanded }: { hashes: string[]; expanded: boolean }) => {
    const expandedSet = get(expandedNodesAtom);
    const newExpanded = new Set(expandedSet);
    if (expanded) {
      hashes.forEach((hash) => newExpanded.add(hash));
    } else {
      hashes.forEach((hash) => newExpanded.delete(hash));
    }
    set(expandedNodesAtom, newExpanded);
  }
);

/**
 * Helper atom to clear all expanded nodes
 */
export const clearAllExpandedNodesAtom = atom(null, (get, set) => {
  set(expandedNodesAtom, new Set<string>());
});

/**
 * Search state atoms
 */

/**
 * Atom storing the current search query
 */
export const searchQueryAtom = atom<string>('');

/**
 * Atom storing search results
 */
export const searchResultsAtom = atom<TreeNodeData[]>([]);

/**
 * Pagination state for search results
 */
export interface SearchPaginationState {
  /** Current cursor for pagination */
  cursor?: string;
  /** Whether there are more results to load */
  hasMore: boolean;
  /** Whether search is currently being performed */
  isLoading: boolean;
}

/**
 * Atom storing search pagination state
 */
export const searchPaginationAtom = atom<SearchPaginationState>({
  hasMore: false,
  isLoading: false,
});

/**
 * Derived atom: Check if we're in search mode (query length > 3)
 */
export const isSearchModeAtom = atom((get) => {
  const query = get(searchQueryAtom);
  return query.trim().length > 3;
});

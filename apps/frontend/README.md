# Frontend Architecture

## Overview

The frontend is a React application that displays a hierarchical tree structure with lazy-loading, pagination, and search capabilities.

## UI Library

We use **shadcn/ui** components, it provides accessible, customizable components built on Radix UI primitives.
Specifically the `TreeView` component, originaly forked from https://github.com/MrLightful/shadcn-tree-view and customized. Removed functions like dragable, disable, node actions etc. We don't need any of that here

## TreeView Component

### State Management: Jotai Atoms

We use **Jotai** for state management instead of traditional React state or Context API.

**Why Jotai?**

- **Minimal re-renders**: Only components using specific atoms re-render when those atoms change
- **Derived atoms**: Easy to create computed values from base atoms
- **Atomic updates**: State changes are granular and predictable
- **No provider needed**: Atoms work without wrapping the app in providers

**Key atoms:**

- `nodesAtom`: Map of all loaded nodes by hash
- `nodeChildrenAtom`: Adjacency list mapping parent hash to child hashes
- `expandedNodesAtom`: Set of currently expanded node hashes
- `nodePaginationAtom`: Pagination state per node (cursor, hasMore, isLoading)

**Benefits for our use case:**

- **Minimum state changes on leaf nodes**: When a leaf node is clicked, only components directly using that node's atom re-render, not the entire tree (!!!!)
- **Preserve expand/collapse state**: When a parent is collapsed and reopened, the `expandedNodesAtom` maintains which children were previously expanded, allowing us to restore their state without re-fetching

### Lazy Loading

Children are loaded on-demand when a node is expanded:

1. User expands a node → `handleExpandedChange` is called
2. Check if children are already loaded (`isInitialized` flag)
3. If not, fetch children from API and store in atoms
4. TreeView automatically displays the new children

## Pagination: Infinite Scroll

Pagination uses **infinite scroll** triggered when scrolling near the bottom of a node's children list.

**How it works:**

- TreeView component calls `onLoadMore` callback when user scrolls near bottom
- `handleLoadMore` checks if more children exist (`hasMore` flag) and loads next page using cursor
- New children are appended to existing children list

**Current issues:**

- Scroll detection can be unreliable in some edge cases
- May trigger multiple times or not trigger when expected (or on time, you can see a little delay near bottom)

## Search

Search functionality builds a complete tree from search results including all ancestor paths.

**How it works:**

1. User types query (minimum 3 characters, debounced 300ms)
2. API returns matching nodes **plus all their ancestor nodes** (full path to root)
3. `buildTree` converts flat array into hierarchical tree structure
4. All nodes in search results are auto-expanded for visibility
5. Search terms are highlighted in node names

**Not yet paginated:**

- Search results pagination exists in the API but frontend currently loads all results
- Future improvement: implement pagination for large search result sets

## Tree Builder

The `buildTree` function converts a flat array of nodes into a hierarchical tree structure.

**Complexity:**

- **Time**: O(n) - two passes through the array
- **Space**: O(n) - map storage for all nodes

**Algorithm:**

1. First pass: Create all nodes and store in a Map by hash
2. Second pass: Link children to parents using `parentHash` references
3. Return root node(s) as array

**Why this approach:**

- Efficient single-pass linking after all nodes are created
- Handles missing parents gracefully (logs warning) but in this example it shouldn't happen
- Works with search results that include ancestor paths (not just matches)

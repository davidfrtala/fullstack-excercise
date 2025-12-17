/**
 * Credits: https://github.com/MrLightful/shadcn-tree-view
 */

// Main component
export { TreeView } from './components/TreeView';

// Sub-components
export { TreeItem } from './components/TreeItem';
export { TreeNode } from './components/TreeNode';
export { TreeLeaf } from './components/TreeLeaf';

// Types
export type {
  TreeDataItem,
  TreeRenderItemParams,
  TreeProps,
  FlattenedTreeItem,
} from './types';

// Hooks (for advanced usage)
export { useFlattenedTree } from './hooks/useFlattenedTree';
export { useTreeExpansion } from './hooks/useTreeExpansion';
export { useTreeSelection } from './hooks/useTreeSelection';
export { useInfiniteScroll } from './hooks/useInfiniteScroll';
export { useTreeKeyboardNavigation } from './hooks/useTreeKeyboardNavigation';
export type { KeyboardNavigationHandlers } from './hooks/useTreeKeyboardNavigation';

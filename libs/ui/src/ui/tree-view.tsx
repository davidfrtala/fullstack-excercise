/**
 * Credits: https://github.com/MrLightful/shadcn-tree-view
 *
 * This file re-exports from the modular tree-view structure.
 * The component has been split into feature-based modules for better maintainability.
 */

// Main component
export { TreeView } from './tree-view/components/TreeView';

// Sub-components
export { TreeItem } from './tree-view/components/TreeItem';
export { TreeNode } from './tree-view/components/TreeNode';
export { TreeLeaf } from './tree-view/components/TreeLeaf';

// Types
export type {
  TreeDataItem,
  TreeRenderItemParams,
  TreeProps,
  FlattenedTreeItem,
} from './tree-view/types';

// Hooks (for advanced usage)
export { useFlattenedTree } from './tree-view/hooks/useFlattenedTree';
export { useTreeExpansion } from './tree-view/hooks/useTreeExpansion';
export { useTreeSelection } from './tree-view/hooks/useTreeSelection';
export { useInfiniteScroll } from './tree-view/hooks/useInfiniteScroll';

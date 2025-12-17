import React from 'react';

export interface TreeDataItem {
  id: string;
  name: string;
  children?: TreeDataItem[];
}

export interface ExtendedTreeDataItem extends TreeDataItem {
  _hasChildren?: boolean;
  _hasMoreChildren?: boolean;
  _isLoadingChildren?: boolean;
}

export type TreeRenderItemParams = {
  item: ExtendedTreeDataItem;
  level: number;
  isLeaf: boolean;
  isSelected: boolean;
  isOpen?: boolean;
  hasChildren: boolean;
};

export type TreeProps = React.HTMLAttributes<HTMLDivElement> & {
  data: TreeDataItem[] | TreeDataItem;
  initialSelectedItemId?: string;
  expandedNodes?: Set<string> | string[]; // External expanded state (from Jotai)
  onSelectChange?: (item: TreeDataItem | undefined) => void;
  onExpandedChange?: (
    item: TreeDataItem | undefined,
    isExpanded: boolean
  ) => void;
  onLoadMore?: (item: TreeDataItem) => void;
  expandAll?: boolean;
  defaultNodeIcon?: React.ComponentType<{ className?: string }>;
  defaultLeafIcon?: React.ComponentType<{ className?: string }>;
  renderItem?: (params: TreeRenderItemParams) => React.ReactNode;
};

export type FlattenedTreeItem = {
  item: TreeDataItem;
  level: number;
  parentId?: string;
  index: number;
};

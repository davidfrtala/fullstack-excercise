import React from 'react';
import { TreeNode } from './TreeNode';
import { TreeLeaf } from './TreeLeaf';
import type { TreeProps, TreeDataItem } from '../types';

export type TreeItemProps = TreeProps & {
  selectedItemId?: string;
  handleSelectChange: (item: TreeDataItem | undefined) => void;
  expandedItemIds: string[];
  expandedSet: Set<string>;
  onExpandedChange?: (itemId: string, isExpanded: boolean) => void;
  defaultNodeIcon?: React.ComponentType<{ className?: string }>;
  defaultLeafIcon?: React.ComponentType<{ className?: string }>;
  level?: number;
};

const TreeItemComponent = React.forwardRef<HTMLDivElement, TreeItemProps>(
  (
    {
      className,
      data,
      selectedItemId,
      handleSelectChange,
      expandedItemIds,
      expandedSet,
      onExpandedChange,
      defaultNodeIcon,
      defaultLeafIcon,
      renderItem,
      level,
      onSelectChange,
      expandAll,
      initialSelectedItemId,
      ...props
    },
    ref
  ) => {
    if (!Array.isArray(data)) {
      data = [data];
    }

    return (
      <div ref={ref} className={className} {...props}>
        <ul role="tree">
          {data.map((item, index) => {
            const commonProps = {
              item,
              index,
              level: level ?? 0,
              selectedItemId,
              handleSelectChange,
              defaultLeafIcon,
              renderItem,
            };
            return (
              <li
                key={item.id}
                role="treeitem"
                aria-selected={selectedItemId === item.id ? 'true' : undefined}
              >
                {item.children ? (
                  <TreeNode
                    {...commonProps}
                    expandedSet={expandedSet}
                    expandedItemIds={expandedItemIds}
                    onExpandedChange={onExpandedChange}
                    defaultNodeIcon={defaultNodeIcon}
                  />
                ) : (
                  <TreeLeaf {...commonProps} />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
);
TreeItemComponent.displayName = 'TreeItem';

// Memoize TreeItem with custom comparison
export const TreeItem = React.memo(
  TreeItemComponent,
  (prevProps, nextProps) => {
    // Compare data arrays/objects
    if (prevProps.data !== nextProps.data) {
      const prevData = Array.isArray(prevProps.data)
        ? prevProps.data
        : [prevProps.data];
      const nextData = Array.isArray(nextProps.data)
        ? nextProps.data
        : [nextProps.data];
      if (prevData.length !== nextData.length) return false;
      if (prevData.some((item, i) => item.id !== nextData[i]?.id)) return false;
    }

    // Compare expandedSet by checking size and key equality
    const expandedSetEqual =
      prevProps.expandedSet.size === nextProps.expandedSet.size &&
      Array.from(prevProps.expandedSet).every((id) =>
        nextProps.expandedSet.has(id)
      );

    // Compare other props
    return (
      prevProps.selectedItemId === nextProps.selectedItemId &&
      prevProps.level === nextProps.level &&
      expandedSetEqual &&
      prevProps.expandedItemIds.length === nextProps.expandedItemIds.length &&
      prevProps.expandedItemIds.every(
        (id, i) => id === nextProps.expandedItemIds[i]
      ) &&
      prevProps.defaultNodeIcon === nextProps.defaultNodeIcon &&
      prevProps.defaultLeafIcon === nextProps.defaultLeafIcon &&
      prevProps.handleSelectChange === nextProps.handleSelectChange &&
      prevProps.onExpandedChange === nextProps.onExpandedChange &&
      prevProps.renderItem === nextProps.renderItem
    );
  }
) as typeof TreeItemComponent;
TreeItem.displayName = 'TreeItem';

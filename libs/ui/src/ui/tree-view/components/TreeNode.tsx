import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@homework/ui/utils';
import { treeVariants, selectedTreeVariants } from '../variants';
import { TreeIcon } from './TreeIcon';
import type { ExtendedTreeDataItem, TreeRenderItemParams } from '../types';

export type TreeNodeProps = {
  item: ExtendedTreeDataItem;
  handleSelectChange: (item: ExtendedTreeDataItem | undefined) => void;
  expandedItemIds: string[];
  expandedSet: Set<string>;
  onExpandedChange?: (itemId: string, isExpanded: boolean) => void;
  selectedItemId?: string;
  defaultNodeIcon?: React.ComponentType<{ className?: string }>;
  defaultLeafIcon?: React.ComponentType<{ className?: string }>;
  renderItem?: (params: TreeRenderItemParams) => React.ReactNode;
  level?: number;
  onKeyDown?: (
    e: React.KeyboardEvent,
    item: ExtendedTreeDataItem,
    index: number
  ) => void;
  focusedItemId?: string;
  index: number;
};

const TreeNodeComponent = ({
  item,
  handleSelectChange,
  expandedSet,
  onExpandedChange,
  selectedItemId,
  defaultNodeIcon,
  renderItem,
  level = 0,
  onKeyDown,
  focusedItemId,
  index,
}: TreeNodeProps) => {
  const isInitiallyExpanded = React.useMemo(
    () => expandedSet.has(item.id),
    [expandedSet, item.id]
  );
  const [value, setValue] = React.useState(
    isInitiallyExpanded ? [item.id] : []
  );
  // Check if node has children: either has loaded children OR has _hasChildren flag (for lazy loading)
  const hasChildren = React.useMemo(
    () => !!item.children?.length || item._hasChildren === true,
    [item.children?.length, item._hasChildren]
  );
  const isSelected = React.useMemo(
    () => selectedItemId === item.id,
    [selectedItemId, item.id]
  );
  const isOpen = React.useMemo(() => value.includes(item.id), [value, item.id]);

  // Sync value with expandedSet changes
  React.useEffect(() => {
    const isExpanded = expandedSet.has(item.id);
    if (isExpanded && !value.includes(item.id)) {
      setValue([item.id]);
    } else if (!isExpanded && value.includes(item.id)) {
      setValue([]);
    }
  }, [expandedSet, item.id, value]);

  // Handle accordion value change and notify parent
  const handleValueChange = React.useCallback(
    (newValue: string[]) => {
      setValue(newValue);
      const isExpanded = newValue.includes(item.id);
      onExpandedChange?.(item.id, isExpanded);
    },
    [item.id, onExpandedChange]
  );

  const isFocused = focusedItemId === item.id;
  const itemRef = React.useRef<HTMLDivElement>(null);

  // Focus the item when it becomes focused
  React.useEffect(() => {
    if (isFocused && itemRef.current) {
      itemRef.current.focus();
    }
  }, [isFocused]);

  // For virtualization, TreeNode is just the header - children are rendered separately
  return (
    <div
      ref={itemRef}
      role="treeitem"
      aria-expanded={hasChildren ? isOpen : undefined}
      aria-selected={isSelected ? 'true' : 'false'}
      aria-level={level + 1}
      data-tree-item-id={item.id}
      tabIndex={isFocused ? 0 : -1}
      className={cn(
        'mx-5 flex text-left items-center py-2 cursor-pointer before:right-1 min-w-0',
        'focus:outline-none focus:rounded-lg focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:z-10',
        treeVariants(),
        isSelected && selectedTreeVariants()
      )}
      style={{ paddingLeft: `${level * 16 + 20}px` }}
      onClick={() => {
        handleSelectChange(item);
        // Only toggle expansion if node has children
        if (hasChildren) {
          handleValueChange(isOpen ? [] : [item.id]);
        }
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e, item, index);
      }}
    >
      <ChevronRight
        className={cn(
          'h-4 w-4 shrink-0 transition-transform duration-200 text-accent-foreground/50 mr-1',
          isOpen && 'rotate-90'
        )}
      />
      {renderItem ? (
        renderItem({
          item,
          level,
          isLeaf: false,
          isSelected,
          isOpen,
          hasChildren,
        })
      ) : (
        <>
          <TreeIcon item={item} default={defaultNodeIcon} />
          <span className="flex-1 min-w-0 text-sm truncate">{item.name}</span>
        </>
      )}
    </div>
  );
};

// Memoize TreeNode with custom comparison
export const TreeNode = React.memo(
  TreeNodeComponent,
  (prevProps, nextProps) => {
    const prevExpanded = prevProps.expandedSet.has(prevProps.item.id);
    const nextExpanded = nextProps.expandedSet.has(nextProps.item.id);
    const prevFocused = prevProps.focusedItemId === prevProps.item.id;
    const nextFocused = nextProps.focusedItemId === nextProps.item.id;

    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item === nextProps.item &&
      prevProps.selectedItemId === nextProps.selectedItemId &&
      prevProps.level === nextProps.level &&
      prevExpanded === nextExpanded &&
      prevFocused === nextFocused &&
      prevProps.defaultNodeIcon === nextProps.defaultNodeIcon &&
      prevProps.defaultLeafIcon === nextProps.defaultLeafIcon &&
      prevProps.handleSelectChange === nextProps.handleSelectChange &&
      prevProps.onExpandedChange === nextProps.onExpandedChange &&
      prevProps.renderItem === nextProps.renderItem &&
      prevProps.onKeyDown === nextProps.onKeyDown &&
      prevProps.index === nextProps.index
    );
  }
);
TreeNode.displayName = 'TreeNode';

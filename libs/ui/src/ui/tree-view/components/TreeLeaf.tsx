import React from 'react';
import { cn } from '@homework/ui/utils';
import { treeVariants, selectedTreeVariants } from '../variants';
import { TreeIcon } from './TreeIcon';
import type { TreeDataItem, TreeRenderItemParams } from '../types';

export type TreeLeafProps = React.HTMLAttributes<HTMLDivElement> & {
  item: TreeDataItem;
  level: number;
  selectedItemId?: string;
  handleSelectChange: (item: TreeDataItem | undefined) => void;
  defaultLeafIcon?: React.ComponentType<{ className?: string }>;
  renderItem?: (params: TreeRenderItemParams) => React.ReactNode;
  onKeyDown?: (
    e: React.KeyboardEvent,
    item: TreeDataItem,
    index: number
  ) => void;
  focusedItemId?: string;
  index: number;
};

const TreeLeafComponent = React.forwardRef<HTMLDivElement, TreeLeafProps>(
  (
    {
      className,
      item,
      level,
      selectedItemId,
      handleSelectChange,
      defaultLeafIcon,
      renderItem,
      onKeyDown,
      focusedItemId,
      index,
      ...props
    },
    ref
  ) => {
    const isSelected = React.useMemo(
      () => selectedItemId === item.id,
      [selectedItemId, item.id]
    );

    const isFocused = focusedItemId === item.id;
    const itemRef = React.useRef<HTMLDivElement>(null);

    // Focus the item when it becomes focused
    React.useEffect(() => {
      if (isFocused && itemRef.current) {
        itemRef.current.focus();
      }
    }, [isFocused]);

    return (
      <div
        ref={(el) => {
          itemRef.current = el;
          if (typeof ref === 'function') {
            ref(el);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }
        }}
        role="treeitem"
        aria-selected={isSelected ? 'true' : 'false'}
        aria-level={level + 1}
        data-tree-item-id={item.id}
        tabIndex={isFocused ? 0 : -1}
        className={cn(
          'mx-5 flex text-left items-center py-2 cursor-pointer before:right-1 min-w-0',
          'focus:outline-none focus:rounded-lg focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:z-10',
          treeVariants(),
          className,
          isSelected && selectedTreeVariants()
        )}
        style={{ paddingLeft: `${level * 16 + 20}px` }}
        onClick={() => {
          handleSelectChange(item);
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e, item, index);
        }}
        {...props}
      >
        <div className="mr-1 w-4 h-4 shrink-0" />
        {renderItem ? (
          renderItem({
            item,
            level,
            isLeaf: true,
            isSelected,
            hasChildren: false,
          })
        ) : (
          <>
            <TreeIcon item={item} default={defaultLeafIcon} />
            <span className="flex-1 min-w-0 text-sm truncate">{item.name}</span>
          </>
        )}
      </div>
    );
  }
);
TreeLeafComponent.displayName = 'TreeLeaf';

// Memoize TreeLeaf with custom comparison
export const TreeLeaf = React.memo(
  TreeLeafComponent,
  (prevProps, nextProps) => {
    const prevFocused = prevProps.focusedItemId === prevProps.item.id;
    const nextFocused = nextProps.focusedItemId === nextProps.item.id;

    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item === nextProps.item &&
      prevProps.selectedItemId === nextProps.selectedItemId &&
      prevProps.level === nextProps.level &&
      prevFocused === nextFocused &&
      prevProps.defaultLeafIcon === nextProps.defaultLeafIcon &&
      prevProps.handleSelectChange === nextProps.handleSelectChange &&
      prevProps.renderItem === nextProps.renderItem &&
      prevProps.onKeyDown === nextProps.onKeyDown &&
      prevProps.index === nextProps.index
    );
  }
) as typeof TreeLeafComponent;
TreeLeaf.displayName = 'TreeLeaf';

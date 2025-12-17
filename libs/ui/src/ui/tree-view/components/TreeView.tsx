import React from 'react';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { cn } from '@homework/ui/utils';
import { useFlattenedTree } from '../hooks/useFlattenedTree';
import { useTreeExpansion } from '../hooks/useTreeExpansion';
import { useTreeSelection } from '../hooks/useTreeSelection';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { useTreeKeyboardNavigation } from '../hooks/useTreeKeyboardNavigation';
import { TreeNode } from './TreeNode';
import { TreeLeaf } from './TreeLeaf';
import type { TreeProps } from '../types';

export const TreeView = React.forwardRef<HTMLDivElement, TreeProps>(
  (
    {
      data,
      initialSelectedItemId,
      expandedNodes,
      onSelectChange,
      onExpandedChange,
      onLoadMore,
      expandAll,
      defaultLeafIcon,
      defaultNodeIcon,
      className,
      renderItem,
      ...props
    },
    ref
  ) => {
    const { selectedItemId, handleSelectChange } = useTreeSelection(
      initialSelectedItemId,
      onSelectChange
    );

    const { expandedItemIds, expandedSetState, handleExpandedChange } =
      useTreeExpansion(
        data,
        initialSelectedItemId,
        expandAll,
        expandedNodes,
        onExpandedChange
      );

    // Flatten tree for virtualization
    const flattenedTree = useFlattenedTree(data, expandedSetState);

    // Container ref for virtualizer
    const parentRef = React.useRef<HTMLDivElement>(null);

    // Virtualizer setup
    const virtualizer = useVirtualizer({
      count: flattenedTree.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 32, // Fixed height per item (32px)
      overscan: 5, // Render 5 extra items above/below viewport
    });

    // Infinite scroll logic
    useInfiniteScroll(flattenedTree, expandedSetState, virtualizer, onLoadMore);

    // Keyboard navigation
    const { onKeyDown, focusedItemId } = useTreeKeyboardNavigation(
      flattenedTree,
      expandedSetState,
      selectedItemId,
      handleSelectChange,
      handleExpandedChange
    );

    return (
      <div
        className={cn('overflow-hidden relative p-2 w-full', className)}
        role="tree"
        aria-label="Tree navigation"
        {...props}
      >
        <div
          ref={(el) => {
            parentRef.current = el;
            if (typeof ref === 'function') {
              ref(el);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLDivElement | null>).current =
                el;
            }
          }}
          className="overflow-x-hidden overflow-y-auto h-full min-h-[200px] max-h-[600px]"
        >
          <div
            className="relative w-full min-w-0"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualItem: VirtualItem) => {
              const flattenedItem = flattenedTree[virtualItem.index];
              if (!flattenedItem) return null;

              const { item, level } = flattenedItem;
              // Check if node has children: either has loaded children OR has _hasChildren flag (for lazy loading)
              const hasChildren =
                !!item.children?.length || item._hasChildren === true;

              const commonProps = {
                item,
                level,
                selectedItemId,
                handleSelectChange,
                defaultLeafIcon,
                renderItem,
                onKeyDown,
                focusedItemId,
                index: virtualItem.index,
              };

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  className="absolute top-0 left-0 w-full min-w-0"
                  style={{
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  {hasChildren ? (
                    <TreeNode
                      {...commonProps}
                      expandedItemIds={expandedItemIds}
                      expandedSet={expandedSetState}
                      onExpandedChange={handleExpandedChange}
                      defaultNodeIcon={defaultNodeIcon}
                    />
                  ) : (
                    <TreeLeaf {...commonProps} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);
TreeView.displayName = 'TreeView';

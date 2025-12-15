/**
 * Credits: https://github.com/MrLightful/shadcn-tree-view
 */
import React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronRight } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { cn } from '@homework/ui/utils';

const treeVariants = cva(
  'group hover:before:opacity-100 before:absolute before:rounded-lg before:left-0 px-2 before:w-full before:opacity-0 before:bg-accent/70 before:h-[2rem] before:-z-10'
);

const selectedTreeVariants = cva(
  'before:opacity-100 before:bg-accent/70 text-accent-foreground'
);

interface TreeDataItem {
  id: string;
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
  selectedIcon?: React.ComponentType<{ className?: string }>;
  openIcon?: React.ComponentType<{ className?: string }>;
  children?: TreeDataItem[];
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

type TreeRenderItemParams = {
  item: TreeDataItem;
  level: number;
  isLeaf: boolean;
  isSelected: boolean;
  isOpen?: boolean;
  hasChildren: boolean;
};

type TreeProps = React.HTMLAttributes<HTMLDivElement> & {
  data: TreeDataItem[] | TreeDataItem;
  initialSelectedItemId?: string;
  onSelectChange?: (item: TreeDataItem | undefined) => void;
  expandAll?: boolean;
  defaultNodeIcon?: React.ComponentType<{ className?: string }>;
  defaultLeafIcon?: React.ComponentType<{ className?: string }>;
  renderItem?: (params: TreeRenderItemParams) => React.ReactNode;
};

type FlattenedTreeItem = {
  item: TreeDataItem;
  level: number;
  parentId?: string;
  index: number;
};

// Hook to flatten tree into visible items only
function useFlattenedTree(
  data: TreeDataItem[] | TreeDataItem,
  expandedSet: Set<string>
): FlattenedTreeItem[] {
  return React.useMemo(() => {
    const flattened: FlattenedTreeItem[] = [];
    let index = 0;

    function walkTree(
      items: TreeDataItem[] | TreeDataItem,
      level: number,
      parentId?: string
    ) {
      const itemsArray = Array.isArray(items) ? items : [items];

      for (const item of itemsArray) {
        flattened.push({
          item,
          level,
          parentId,
          index: index++,
        });

        // Only walk children if this node is expanded
        if (
          item.children &&
          item.children.length > 0 &&
          expandedSet.has(item.id)
        ) {
          walkTree(item.children, level + 1, item.id);
        }
      }
    }

    walkTree(data, 0);
    return flattened;
  }, [data, expandedSet]);
}

const TreeView = React.forwardRef<HTMLDivElement, TreeProps>(
  (
    {
      data,
      initialSelectedItemId,
      onSelectChange,
      expandAll,
      defaultLeafIcon,
      defaultNodeIcon,
      className,
      renderItem,
      ...props
    },
    ref
  ) => {
    const [selectedItemId, setSelectedItemId] = React.useState<
      string | undefined
    >(initialSelectedItemId);

    const handleSelectChange = React.useCallback(
      (item: TreeDataItem | undefined) => {
        setSelectedItemId(item?.id);
        if (onSelectChange) {
          onSelectChange(item);
        }
      },
      [onSelectChange]
    );

    const expandedItemIds = React.useMemo(() => {
      if (!initialSelectedItemId) {
        return [] as string[];
      }

      const ids: string[] = [];

      function walkTreeItems(
        items: TreeDataItem[] | TreeDataItem,
        targetId: string
      ): boolean {
        if (Array.isArray(items)) {
          for (let i = 0; i < items.length; i++) {
            ids.push(items[i].id);
            if (walkTreeItems(items[i], targetId) && !expandAll) {
              return true;
            }
            if (!expandAll) ids.pop();
          }
          return false;
        } else if (!expandAll && items.id === targetId) {
          return true;
        } else if (items.children) {
          return walkTreeItems(items.children, targetId);
        }
        return false;
      }

      walkTreeItems(data, initialSelectedItemId);
      return ids;
    }, [data, expandAll, initialSelectedItemId]);

    // Create expandedSet for O(1) lookups
    const expandedSet = React.useMemo(
      () => new Set(expandedItemIds),
      [expandedItemIds]
    );

    // Track expanded state for lazy loading
    const [expandedSetState, setExpandedSetState] =
      React.useState<Set<string>>(expandedSet);

    // Sync expandedSetState when expandedItemIds changes
    React.useEffect(() => {
      setExpandedSetState(expandedSet);
    }, [expandedSet]);

    const handleExpandedChange = React.useCallback(
      (itemId: string, isExpanded: boolean) => {
        setExpandedSetState((prev) => {
          const next = new Set(prev);
          if (isExpanded) {
            next.add(itemId);
          } else {
            next.delete(itemId);
          }
          return next;
        });
      },
      []
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

    return (
      <div className={cn('overflow-hidden relative p-2', className)} {...props}>
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
          className="h-full overflow-auto"
          style={
            { minHeight: '200px', maxHeight: '600px' } as React.CSSProperties
          }
        >
          <div
            style={
              {
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              } as React.CSSProperties
            }
          >
            {virtualizer.getVirtualItems().map((virtualItem: VirtualItem) => {
              const flattenedItem = flattenedTree[virtualItem.index];
              if (!flattenedItem) return null;

              const { item, level } = flattenedItem;
              const hasChildren = !!item.children?.length;

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={
                    {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    } as React.CSSProperties
                  }
                >
                  {hasChildren ? (
                    <TreeNode
                      item={item}
                      level={level}
                      selectedItemId={selectedItemId}
                      expandedItemIds={expandedItemIds}
                      expandedSet={expandedSetState}
                      onExpandedChange={handleExpandedChange}
                      handleSelectChange={handleSelectChange}
                      defaultNodeIcon={defaultNodeIcon}
                      defaultLeafIcon={defaultLeafIcon}
                      renderItem={renderItem}
                    />
                  ) : (
                    <TreeLeaf
                      item={item}
                      level={level}
                      selectedItemId={selectedItemId}
                      handleSelectChange={handleSelectChange}
                      defaultLeafIcon={defaultLeafIcon}
                      renderItem={renderItem}
                    />
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

type TreeItemProps = TreeProps & {
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
          {data.map((item) => (
            <li
              key={item.id}
              role="treeitem"
              aria-selected={selectedItemId === item.id ? 'true' : undefined}
            >
              {item.children ? (
                <TreeNode
                  item={item}
                  level={level ?? 0}
                  selectedItemId={selectedItemId}
                  expandedItemIds={expandedItemIds}
                  expandedSet={expandedSet}
                  onExpandedChange={onExpandedChange}
                  handleSelectChange={handleSelectChange}
                  defaultNodeIcon={defaultNodeIcon}
                  defaultLeafIcon={defaultLeafIcon}
                  renderItem={renderItem}
                />
              ) : (
                <TreeLeaf
                  item={item}
                  level={level ?? 0}
                  selectedItemId={selectedItemId}
                  handleSelectChange={handleSelectChange}
                  defaultLeafIcon={defaultLeafIcon}
                  renderItem={renderItem}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }
);
TreeItemComponent.displayName = 'TreeItem';

// Memoize TreeItem with custom comparison
const TreeItem = React.memo(TreeItemComponent, (prevProps, nextProps) => {
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
}) as typeof TreeItemComponent;
TreeItem.displayName = 'TreeItem';

type TreeNodeProps = {
  item: TreeDataItem;
  handleSelectChange: (item: TreeDataItem | undefined) => void;
  expandedItemIds: string[];
  expandedSet: Set<string>;
  onExpandedChange?: (itemId: string, isExpanded: boolean) => void;
  selectedItemId?: string;
  defaultNodeIcon?: React.ComponentType<{ className?: string }>;
  defaultLeafIcon?: React.ComponentType<{ className?: string }>;
  renderItem?: (params: TreeRenderItemParams) => React.ReactNode;
  level?: number;
};

const TreeNodeComponent = ({
  item,
  handleSelectChange,
  expandedItemIds,
  expandedSet,
  onExpandedChange,
  selectedItemId,
  defaultNodeIcon,
  defaultLeafIcon,
  renderItem,
  level = 0,
}: TreeNodeProps) => {
  const isInitiallyExpanded = React.useMemo(
    () => expandedSet.has(item.id),
    [expandedSet, item.id]
  );
  const [value, setValue] = React.useState(
    isInitiallyExpanded ? [item.id] : []
  );
  const hasChildren = React.useMemo(
    () => !!item.children?.length,
    [item.children?.length]
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

  // For virtualization, TreeNode is just the header - children are rendered separately
  return (
    <div
      className={cn(
        'ml-5 flex text-left items-center py-2 cursor-pointer before:right-1',
        treeVariants(),
        isSelected && selectedTreeVariants(),
        item.className
      )}
      style={{ paddingLeft: `${level * 16 + 20}px` } as React.CSSProperties}
      onClick={() => {
        handleSelectChange(item);
        item.onClick?.();
        // Toggle expansion
        handleValueChange(isOpen ? [] : [item.id]);
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
          <TreeIcon
            item={item}
            isSelected={isSelected}
            isOpen={isOpen}
            default={defaultNodeIcon}
          />
          <span className="text-sm truncate">{item.name}</span>
          <TreeActions isSelected={isSelected}>{item.actions}</TreeActions>
        </>
      )}
    </div>
  );
};

// Memoize TreeNode with custom comparison
const TreeNode = React.memo(TreeNodeComponent, (prevProps, nextProps) => {
  const prevExpanded = prevProps.expandedSet.has(prevProps.item.id);
  const nextExpanded = nextProps.expandedSet.has(nextProps.item.id);

  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item === nextProps.item &&
    prevProps.selectedItemId === nextProps.selectedItemId &&
    prevProps.level === nextProps.level &&
    prevExpanded === nextExpanded &&
    prevProps.defaultNodeIcon === nextProps.defaultNodeIcon &&
    prevProps.defaultLeafIcon === nextProps.defaultLeafIcon &&
    prevProps.handleSelectChange === nextProps.handleSelectChange &&
    prevProps.onExpandedChange === nextProps.onExpandedChange &&
    prevProps.renderItem === nextProps.renderItem
  );
});

type TreeLeafProps = React.HTMLAttributes<HTMLDivElement> & {
  item: TreeDataItem;
  level: number;
  selectedItemId?: string;
  handleSelectChange: (item: TreeDataItem | undefined) => void;
  defaultLeafIcon?: React.ComponentType<{ className?: string }>;
  renderItem?: (params: TreeRenderItemParams) => React.ReactNode;
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
      ...props
    },
    ref
  ) => {
    const isSelected = React.useMemo(
      () => selectedItemId === item.id,
      [selectedItemId, item.id]
    );

    return (
      <div
        ref={ref}
        className={cn(
          'ml-5 flex text-left items-center py-2 cursor-pointer before:right-1',
          treeVariants(),
          className,
          isSelected && selectedTreeVariants(),
          item.className
        )}
        style={{ paddingLeft: `${level * 16 + 20}px` } as React.CSSProperties}
        onClick={() => {
          handleSelectChange(item);
          item.onClick?.();
        }}
        {...props}
      >
        {renderItem ? (
          <>
            <div className="h-4 w-4 shrink-0 mr-1" />
            {renderItem({
              item,
              level,
              isLeaf: true,
              isSelected,
              hasChildren: false,
            })}
          </>
        ) : (
          <>
            <div className="h-4 w-4 shrink-0 mr-1" />
            <TreeIcon
              item={item}
              isSelected={isSelected}
              default={defaultLeafIcon}
            />
            <span className="flex-grow text-sm truncate">{item.name}</span>
            <TreeActions isSelected={isSelected}>{item.actions}</TreeActions>
          </>
        )}
      </div>
    );
  }
);
TreeLeafComponent.displayName = 'TreeLeaf';

// Memoize TreeLeaf with custom comparison
const TreeLeaf = React.memo(TreeLeafComponent, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item === nextProps.item &&
    prevProps.selectedItemId === nextProps.selectedItemId &&
    prevProps.level === nextProps.level &&
    prevProps.defaultLeafIcon === nextProps.defaultLeafIcon &&
    prevProps.handleSelectChange === nextProps.handleSelectChange &&
    prevProps.renderItem === nextProps.renderItem
  );
}) as typeof TreeLeafComponent;
TreeLeaf.displayName = 'TreeLeaf';

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header>
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 w-full items-center py-2 transition-all first:[&[data-state=open]>svg]:first-of-type:rotate-90',
        className
      )}
      {...props}
    >
      <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 text-accent-foreground/50 mr-1" />
      {children}
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      'overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
      className
    )}
    {...props}
  >
    <div className="pb-1 pt-0">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

const TreeIcon = ({
  item,
  isOpen,
  isSelected,
  default: defaultIcon,
}: {
  item: TreeDataItem;
  isOpen?: boolean;
  isSelected?: boolean;
  default?: React.ComponentType<{ className?: string }>;
}) => {
  const Icon = React.useMemo(() => {
    if (isSelected && item.selectedIcon) {
      return item.selectedIcon;
    } else if (isOpen && item.openIcon) {
      return item.openIcon;
    } else if (item.icon) {
      return item.icon;
    }
    return defaultIcon;
  }, [
    isSelected,
    isOpen,
    item.selectedIcon,
    item.openIcon,
    item.icon,
    defaultIcon,
  ]);

  return Icon ? <Icon className="h-4 w-4 shrink-0 mr-2" /> : null;
};

const TreeActions = ({
  children,
  isSelected,
}: {
  children: React.ReactNode;
  isSelected: boolean;
}) => {
  return (
    <div
      className={cn(
        isSelected ? 'block' : 'hidden',
        'absolute right-3 group-hover:block'
      )}
    >
      {children}
    </div>
  );
};

export {
  TreeView,
  type TreeDataItem,
  type TreeRenderItemParams,
  AccordionTrigger,
  AccordionContent,
  TreeLeaf,
  TreeNode,
  TreeItem,
};

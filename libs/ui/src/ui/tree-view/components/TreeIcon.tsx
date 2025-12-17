import React from 'react';
import type { TreeDataItem } from '../types';

export const TreeIcon = ({
  item,
  default: defaultIcon,
}: {
  item: TreeDataItem;
  default?: React.ComponentType<{ className?: string }>;
}) => {
  const Icon = React.useMemo(() => {
    return defaultIcon;
  }, [defaultIcon]);

  return Icon ? <Icon className="mr-2 w-4 h-4 shrink-0" /> : null;
};

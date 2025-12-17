import React from 'react';
import type { TreeDataItem } from '../types';

export function useTreeSelection(
  initialSelectedItemId?: string,
  onSelectChange?: (item: TreeDataItem | undefined) => void
) {
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

  return {
    selectedItemId,
    handleSelectChange,
  };
}

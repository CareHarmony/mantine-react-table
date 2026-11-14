import { type CSSProperties } from 'react';

import { defaultRangeExtractor, type Range } from '@tanstack/react-virtual';

import {
  type MRT_Header,
  type MRT_RowData,
  type MRT_TableInstance,
  type MRT_VirtualItem,
} from '../types';

/**
 * Column virtualization indexes the visible leaf columns. A header group that
 * holds group headers has fewer headers than there are leaf columns, so
 * `headers[virtualColumn.index]` does not find the right header there.
 *
 * Returns the headers that sit above at least one rendered leaf column, or
 * `undefined` for a header group of leaf headers, which the index does match.
 * `style` narrows a group header when only some of its columns are rendered.
 */
export const getVirtualGroupHeaders = <TData extends MRT_RowData>({
  headers,
  table,
  virtualColumns,
}: {
  headers: MRT_Header<TData>[];
  table: MRT_TableInstance<TData>;
  virtualColumns?: MRT_VirtualItem[];
}):
  | { header: MRT_Header<TData>; index: number; style?: CSSProperties }[]
  | undefined => {
  if (!virtualColumns || !headers.some((header) => header.subHeaders?.length)) {
    return undefined;
  }
  const { layoutMode } = table.options;
  const leafIndexes = new Map(
    table.getVisibleLeafColumns().map((column, index) => [column.id, index]),
  );
  const virtualIndexes = new Set(
    virtualColumns.map((virtualColumn) => virtualColumn.index),
  );
  return headers.flatMap((header) => {
    const leafHeaders = header
      .getLeafHeaders()
      .filter((leafHeader) => !leafHeader.subHeaders?.length);
    const renderedLeafHeaders = leafHeaders.filter((leafHeader) =>
      virtualIndexes.has(leafIndexes.get(leafHeader.column.id) ?? -1),
    );
    if (!renderedLeafHeaders.length) return [];
    let style: CSSProperties | undefined;
    if (renderedLeafHeaders.length < leafHeaders.length) {
      const size = renderedLeafHeaders.reduce(
        (total, leafHeader) => total + leafHeader.getSize(),
        0,
      );
      style = { minWidth: `${size}px`, width: `${size}px` };
      if (layoutMode === 'grid') style.flex = `${size} 0 auto`;
    }
    return [
      {
        header,
        index: leafIndexes.get(renderedLeafHeaders[0].column.id) as number,
        style,
      },
    ];
  });
};

export const extraIndexRangeExtractor = (
  range: Range,
  draggingIndex?: number,
) => {
  const newIndexes = defaultRangeExtractor(range);
  if (draggingIndex === undefined) return newIndexes;
  if (
    draggingIndex >= 0 &&
    draggingIndex < Math.max(range.startIndex - range.overscan, 0)
  ) {
    newIndexes.unshift(draggingIndex);
  }
  if (draggingIndex >= 0 && draggingIndex > range.endIndex + range.overscan) {
    newIndexes.push(draggingIndex);
  }
  return newIndexes;
};

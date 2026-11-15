'use no memo';

import { useEffect, useReducer } from 'react';

/**
 * TanStack Virtual reads its scroll element in a layout effect. Child layout
 * effects run before the table container attaches its ref, so the first read
 * returns null and no rows or columns are rendered.
 *
 * Passive effects run after every ref is attached. This hook re-renders the
 * owner once when the virtualizer still holds a different scroll element, so
 * the next layout effect picks up the mounted container. The virtualizer no
 * longer depends on an unrelated parent re-render, which compiled consumer
 * code does not produce.
 */
export const useMRT_VirtualizerScrollElement = (virtualizer: {
  options: { enabled?: boolean; getScrollElement: () => unknown };
  scrollElement: unknown;
}) => {
  const rerender = useReducer((version: number) => version + 1, 0)[1];

  useEffect(() => {
    //the virtualizer's own options decide the element, so a consumer's
    //`getScrollElement` or `enabled: false` never leaves a permanent mismatch
    const { enabled, getScrollElement } = virtualizer.options;
    const scrollElement = enabled === false ? null : getScrollElement();
    if (scrollElement && virtualizer.scrollElement !== scrollElement) {
      rerender();
    }
  });
};

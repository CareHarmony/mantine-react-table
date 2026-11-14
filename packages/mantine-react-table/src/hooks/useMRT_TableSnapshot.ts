import { useRef } from 'react';

import {
  type MRT_RowData,
  type MRT_TableInstance,
  type MRT_TableOptions,
} from '../types';

type Snapshot<TData extends MRT_RowData> = {
  options: Record<string, unknown>;
  state: Record<string, unknown>;
  table: MRT_TableInstance<TData>;
  version: number;
};

//`state` and `initialState` are compared through `table.getState()` instead
const ignoredOptionKeys = new Set(['initialState', 'state']);

const shallowEqual = (
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  ignoredKeys?: Set<string>,
) => {
  if (a === b) return true;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (ignoredKeys?.has(key)) continue;
    if (!Object.is(a[key], b[key]) || !(key in b)) return false;
  }
  return true;
};

/**
 * TanStack Table mutates one table instance for the lifetime of the hook. The
 * React Compiler memoizes on reference identity, so compiled consumer code
 * (`<MantineReactTable table={table} />`, `table.getState()` and so on) never
 * sees a change on that instance.
 *
 * This hook returns a new reference whenever table state, table options or the
 * internal render version change, and the same reference otherwise. Each
 * reference delegates to the one underlying instance through its prototype,
 * so every reference reads current data and an old reference is never stale.
 */
export const useMRT_TableSnapshot = <TData extends MRT_RowData>(
  table: MRT_TableInstance<TData>,
  tableOptions: MRT_TableOptions<TData>,
  version: number,
): MRT_TableInstance<TData> => {
  const snapshotRef = useRef<null | Snapshot<TData>>(null);

  const options = tableOptions as unknown as Record<string, unknown>;
  const state = table.getState() as unknown as Record<string, unknown>;
  const previous = snapshotRef.current;

  if (
    !previous ||
    previous.version !== version ||
    !shallowEqual(previous.state, state) ||
    !shallowEqual(previous.options, options, ignoredOptionKeys)
  ) {
    const snapshot = Object.create(table) as MRT_TableInstance<TData>;
    //a new function identity keeps `const { getState } = table` reactive too
    snapshot.getState = () => table.getState();
    snapshotRef.current = { options, state, table: snapshot, version };
  }

  return snapshotRef.current!.table;
};

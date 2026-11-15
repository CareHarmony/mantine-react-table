'use no memo';

import { useRef } from 'react';

import {
  type MRT_RowData,
  type MRT_TableInstance,
  type MRT_TableOptions,
} from '../types';
import { createMRT_View } from '../utils/snapshot.utils';

type Snapshot<TData extends MRT_RowData> = {
  options: Record<string, unknown>;
  state: Record<string, unknown>;
  stateVersion: number;
  table: MRT_TableInstance<TData>;
  version: number;
};

//`state` and `initialState` are compared through `table.getState()` instead
const ignoredOptionKeys = new Set(['initialState', 'state']);

const isPlain = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return (
    prototype === Object.prototype || prototype === null || Array.isArray(value)
  );
};

/**
 * Compares plain objects and arrays by content, `depth` levels deep, and
 * everything else by identity. `table.setSorting([{ desc: false, id: 'name' }])`
 * with the sorting that is already set makes a new array with the same content,
 * and that must not count as a change.
 */
const isEqual = (a: unknown, b: unknown, depth: number): boolean => {
  if (Object.is(a, b)) return true;
  if (
    !depth ||
    !isPlain(a) ||
    !isPlain(b) ||
    Array.isArray(a) !== Array.isArray(b)
  ) {
    return false;
  }
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => key in b && isEqual(a[key], b[key], depth - 1))
  );
};

/**
 * Option objects such as `mantineTableProps={{ striped: true }}` compare by
 * content. Arrays (`data`, `columns`) and functions compare by identity,
 * because TanStack rebuilds rows and columns when their identity changes.
 */
const optionsEqual = (
  a: Record<string, unknown>,
  b: Record<string, unknown>,
) => {
  if (a === b) return true;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every(
      (key) =>
        key in b &&
        (ignoredOptionKeys.has(key) ||
          isEqual(a[key], b[key], Array.isArray(a[key]) ? 0 : 1)),
    )
  );
};

const stateVersions = new WeakMap<object, number>();

/**
 * A number that changes when table state changes, and not when only table
 * options change. `memoMode: 'rows'` compares it, so a consumer that passes
 * inline options still gets memoized rows.
 */
export const getMRT_TableStateVersion = (table: object) =>
  stateVersions.get(table);

/**
 * TanStack Table mutates one table instance for the lifetime of the hook. The
 * React Compiler memoizes on reference identity, so compiled consumer code
 * (`<MantineReactTable table={table} />`, `table.getState()` and so on) never
 * sees a change on that instance.
 *
 * This hook returns a new reference whenever table state, table options or the
 * internal render version change, and the same reference otherwise. State and
 * option objects are compared by content, so a setter called with the current
 * value keeps the reference. A function option is compared by identity: pass a
 * stable function (`useCallback` or the React Compiler) to keep the reference
 * across renders of the component that calls the hook. Each
 * reference is a view (see `snapshot.utils.ts`) of the one underlying instance,
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

  const stateChanged =
    !previous ||
    previous.version !== version ||
    !isEqual(previous.state, state, 3);

  if (stateChanged || !optionsEqual(previous.options, options)) {
    const snapshot = createMRT_View(table, {
      //a new function identity keeps `const { getState } = table` reactive too
      getState: () => table.getState(),
    } as Partial<MRT_TableInstance<TData>>);
    const stateVersion = (previous?.stateVersion ?? 0) + (stateChanged ? 1 : 0);
    stateVersions.set(snapshot, stateVersion);
    snapshotRef.current = {
      options,
      state,
      stateVersion,
      table: snapshot,
      version,
    };
  }

  return snapshotRef.current!.table;
};

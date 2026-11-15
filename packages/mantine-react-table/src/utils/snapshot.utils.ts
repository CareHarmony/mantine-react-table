import {
  type MRT_Cell,
  type MRT_Column,
  type MRT_Header,
  type MRT_Row,
  type MRT_RowData,
  type MRT_TableInstance,
} from '../types';

/**
 * TanStack Table keeps one table, row, cell, column and header instance for as
 * long as the data and column definitions stay the same. The React Compiler
 * caches a call such as `row.getIsSelected()` on the identity of `row`, so a
 * compiled consumer component would keep the first result forever.
 *
 * A view is a `Proxy` around the TanStack instance. Reads, writes, method
 * calls and object spreads all reach the live instance, and only the identity
 * is new. `useMantineReactTable` returns a new table view whenever table state
 * or options change, and row, cell, column and header views are cached per
 * table view, so they change exactly when the table does.
 */
const viewsByTable = new WeakMap<object, WeakMap<object, object>>();
const targetsByView = new WeakMap<object, object>();

/** Returns the TanStack instance behind a view, or the object itself. */
export const getMRT_ViewTarget = <T extends object>(viewOrTarget: T): T =>
  (targetsByView.get(viewOrTarget) as T | undefined) ?? viewOrTarget;

/**
 * Creates a view of a TanStack instance.
 * @param overrides - properties the view answers itself instead of the instance
 */
export const createMRT_View = <T extends object>(
  viewOrTarget: T,
  overrides?: Partial<T>,
): T => {
  const target = getMRT_ViewTarget(viewOrTarget);
  const view = new Proxy(
    target,
    overrides
      ? {
          get: (instance, key) =>
            key in overrides
              ? overrides[key as keyof T]
              : instance[key as keyof T],
        }
      : {},
  );
  targetsByView.set(view, target);
  return view;
};

const getView = <T extends object>(
  table: object,
  viewOrTarget: T,
  getOverrides?: (target: T) => Partial<T>,
): T => {
  const target = getMRT_ViewTarget(viewOrTarget);
  let views = viewsByTable.get(table);
  if (!views) {
    views = new WeakMap();
    viewsByTable.set(table, views);
  }
  let view = views.get(target) as T | undefined;
  if (!view) {
    view = createMRT_View(target, getOverrides?.(target));
    views.set(target, view);
  }
  return view;
};

export const getMRT_RowView = <TData extends MRT_RowData>(
  table: MRT_TableInstance<TData>,
  row: MRT_Row<TData>,
): MRT_Row<TData> => getView(table, row);

export const getMRT_ColumnView = <TData extends MRT_RowData, TValue = unknown>(
  table: MRT_TableInstance<TData>,
  column: MRT_Column<TData, TValue>,
): MRT_Column<TData, TValue> => getView(table, column);

export const getMRT_CellView = <TData extends MRT_RowData, TValue = unknown>(
  table: MRT_TableInstance<TData>,
  cell: MRT_Cell<TData, TValue>,
): MRT_Cell<TData, TValue> =>
  getView(table, cell, (target) => ({
    column: getMRT_ColumnView(table, target.column),
    row: getMRT_RowView(table, target.row),
  }));

export const getMRT_HeaderView = <TData extends MRT_RowData>(
  table: MRT_TableInstance<TData>,
  header: MRT_Header<TData>,
): MRT_Header<TData> =>
  getView(table, header, (target) => ({
    column: getMRT_ColumnView(table, target.column),
  }));

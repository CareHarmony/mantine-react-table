/**
 * Table patterns taken from a production application that had to opt every
 * table component out of the React Compiler with 'use no memo'. None of these
 * components carries the directive. The compiler compiles this file in the
 * `consumer` and `all` test modes.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { columns, manyPeople, people, type Person } from './data';

import {
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_ColumnFiltersState,
  type MRT_ColumnOrderState,
  type MRT_PaginationState,
  type MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  type MRT_SortingState,
  type MRT_TableInstance,
  type MRT_VisibilityState,
  useMantineReactTable,
} from '@careharmony/mantine-react-table-ng';

/**
 * Server-side table: sorting, filters and pagination are consumer state, the
 * rows are derived from that state, and all three are `manual`.
 */
export const ServerSideTable = () => {
  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = useState<MRT_SortingState>([]);
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: 0,
    pageSize: 2,
  });

  const query = JSON.stringify({ columnFilters, pagination, sorting });

  const filtered = people.filter((person) =>
    columnFilters.every((filter) =>
      String(person[filter.id as keyof Person])
        .toLowerCase()
        .includes(String(filter.value).toLowerCase()),
    ),
  );
  const sorted = [...filtered].sort((a, b) => {
    const [sort] = sorting;
    if (!sort) return 0;
    const key = sort.id as keyof Person;
    const result = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
    return sort.desc ? -result : result;
  });
  const start = pagination.pageIndex * pagination.pageSize;
  const pageRows = sorted.slice(start, start + pagination.pageSize);

  const table = useMantineReactTable({
    columns,
    data: pageRows,
    getRowId: (row) => row.id,
    initialState: { showColumnFilters: true },
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    paginationDisplayMode: 'pages',
    rowCount: filtered.length,
    state: { columnFilters, pagination, sorting },
  });

  return (
    <>
      <output data-testid="query">{query}</output>
      <MantineReactTable table={table} />
    </>
  );
};

/** Column order and visibility owned by the consumer, as persisted views do. */
export const ControlledColumnOrderTable = () => {
  const [columnOrder, setColumnOrder] = useState<MRT_ColumnOrderState>([
    'firstName',
    'lastName',
    'age',
    'city',
  ]);
  const [columnVisibility, setColumnVisibility] = useState<MRT_VisibilityState>(
    {},
  );

  const table = useMantineReactTable({
    columns,
    data: people,
    enableColumnOrdering: true,
    getRowId: (row) => row.id,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    state: { columnOrder, columnVisibility },
  });

  return (
    <>
      <output data-testid="column-order">{columnOrder.join(',')}</output>
      <output data-testid="visible-columns">
        {table
          .getVisibleLeafColumns()
          .map((column) => column.id)
          .join(',')}
      </output>
      <button
        onClick={() => setColumnOrder(['city', 'age', 'lastName', 'firstName'])}
      >
        reverse order
      </button>
      <button onClick={() => setColumnVisibility({ age: false })}>
        hide age
      </button>
      <MantineReactTable table={table} />
    </>
  );
};

/** Column order and visibility owned by the table, changed through its API. */
export const UncontrolledColumnOrderTable = () => {
  const table = useMantineReactTable({
    columns,
    data: people,
    enableColumnOrdering: true,
    getRowId: (row) => row.id,
  });

  return (
    <>
      <output data-testid="column-order">
        {table.getState().columnOrder.join(',')}
      </output>
      <button
        onClick={() =>
          table.setColumnOrder(['city', 'age', 'lastName', 'firstName'])
        }
      >
        reverse order
      </button>
      <button onClick={() => table.getColumn('age').toggleVisibility(false)}>
        hide age
      </button>
      <button onClick={() => table.resetColumnOrder()}>reset order</button>
      <MantineReactTable table={table} />
    </>
  );
};

/** The show/hide columns button used on its own, outside of a table. */
export const ShowHideColumnsHarness = () => {
  const table = useMantineReactTable({
    columns,
    data: people,
    enableColumnOrdering: true,
    getRowId: (row) => row.id,
  });
  return (
    <>
      <MRT_ShowHideColumnsButton table={table} />
      <output data-testid="hidden-columns">
        {JSON.stringify(table.getState().columnVisibility)}
      </output>
    </>
  );
};

/** Reads the row model during render to drive UI outside of the table. */
export const RowModelReaderTable = () => {
  const table = useMantineReactTable({
    columns,
    data: people,
    enableGrouping: true,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 3 } },
  });

  const queue = table
    .getPrePaginationRowModel()
    .rows.map((row) => row.id)
    .join(',');
  const pageIds = table
    .getRowModel()
    .rows.map((row) => row.id)
    .join(',');
  const allOnPageSelected = table.getIsAllPageRowsSelected();

  return (
    <>
      <output data-testid="queue">{queue}</output>
      <output data-testid="page-ids">{pageIds}</output>
      <output data-testid="all-on-page-selected">
        {String(allOnPageSelected)}
      </output>
      <output data-testid="grouping">
        {table.getState().grouping.join(',')}
      </output>
      <button onClick={() => table.setSorting([{ desc: true, id: 'age' }])}>
        sort age desc
      </button>
      <button onClick={() => table.setGlobalFilter('o')}>filter o</button>
      <button onClick={() => table.nextPage()}>next page</button>
      <button onClick={() => table.toggleAllPageRowsSelected(true)}>
        select page
      </button>
      <button onClick={() => table.setGrouping(['city'])}>group by city</button>
      <MantineReactTable table={table} />
    </>
  );
};

/** Table methods pulled off the instance before use. */
export const DestructuredTable = () => {
  const table = useMantineReactTable({
    columns,
    data: people,
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });
  const { getState, setDensity } = table;
  const { density, rowSelection } = getState();
  return (
    <>
      <output data-testid="density">{density}</output>
      <output data-testid="selection">{JSON.stringify(rowSelection)}</output>
      <button onClick={() => setDensity('xl')}>set density xl</button>
      <MantineReactTable table={table} />
    </>
  );
};

/** Row editing that writes back to consumer state. */
export const EditingTable = () => {
  const [data, setData] = useState(people);
  const editColumns = useMemo<MRT_ColumnDef<Person>[]>(
    () => [
      { accessorKey: 'firstName', header: 'First Name' },
      { accessorKey: 'city', header: 'City' },
    ],
    [],
  );
  const table = useMantineReactTable({
    columns: editColumns,
    data,
    editDisplayMode: 'row',
    enableEditing: true,
    getRowId: (row) => row.id,
    onEditingRowSave: ({ row, table: instance, values }) => {
      setData((prev) =>
        prev.map((person) =>
          person.id === row.id ? { ...person, ...values } : person,
        ),
      );
      instance.setEditingRow(null);
    },
  });
  return (
    <>
      <output data-testid="editing-row">
        {table.getState().editingRow?.id ?? 'none'}
      </output>
      <output data-testid="cities">
        {data.map((person) => person.city).join(',')}
      </output>
      <MantineReactTable table={table} />
    </>
  );
};

/** Virtualized rows with a consumer-held virtualizer ref. */
export const VirtualizedTable = () => {
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);
  const [sorting, setSorting] = useState<MRT_SortingState>([]);
  const data = useMemo(() => manyPeople(200), []);

  const table = useMantineReactTable({
    columns,
    data,
    enableBottomToolbar: false,
    enablePagination: false,
    enableRowVirtualization: true,
    getRowId: (row) => row.id,
    mantineTableContainerProps: { style: { maxHeight: '400px' } },
    onSortingChange: setSorting,
    rowVirtualizerInstanceRef,
    rowVirtualizerOptions: { overscan: 2 },
    state: { sorting },
  });

  useEffect(() => {
    rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
  }, [sorting]);

  return (
    <>
      <output data-testid="sorting">{JSON.stringify(sorting)}</output>
      <button onClick={() => setSorting([{ desc: true, id: 'age' }])}>
        sort age desc
      </button>
      <MantineReactTable table={table} />
    </>
  );
};

/** Counts how often an effect that depends on the table reference runs. */
export const TableEffectCounter = ({
  onTable,
}: {
  onTable: (table: MRT_TableInstance<Person>) => void;
}) => {
  const [unrelated, setUnrelated] = useState(0);
  const table = useMantineReactTable({
    columns,
    data: people,
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });

  useEffect(() => {
    onTable(table);
  }, [onTable, table]);

  return (
    <>
      <output data-testid="unrelated">{unrelated}</output>
      <button onClick={() => setUnrelated((value) => value + 1)}>
        unrelated update
      </button>
      <MantineReactTable table={table} />
    </>
  );
};

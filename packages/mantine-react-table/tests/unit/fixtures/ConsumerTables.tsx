/**
 * Consumer-style components. The React Compiler compiles this file in the
 * `consumer` and `all` test modes, so each component mirrors code that an
 * application would write against the public API.
 */
import { useState } from 'react';

import { Button } from '@mantine/core';

import { columns, people, type Person } from './data';

import {
  MantineReactTable,
  type MRT_Cell,
  type MRT_ColumnDef,
  MRT_GlobalFilterTextInput,
  type MRT_Row,
  type MRT_SortingState,
  MRT_TableContainer,
  type MRT_TableInstance,
  MRT_TablePagination,
  MRT_ToolbarInternalButtons,
  useMantineReactTable,
} from 'mantine-react-table-ng';

/** Reads table state next to the hook, outside of any MRT component. */
export const HookTable = () => {
  const table = useMantineReactTable({
    columns,
    data: people,
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });

  const selectedCount = table.getSelectedRowModel().rows.length;
  const { density, showColumnFilters, sorting } = table.getState();

  return (
    <>
      <output data-testid="selected-count">{selectedCount}</output>
      <output data-testid="sorting">{JSON.stringify(sorting)}</output>
      <output data-testid="density">{density}</output>
      <output data-testid="show-filters">{String(showColumnFilters)}</output>
      <output data-testid="page-rows">{table.getRowModel().rows.length}</output>
      <button onClick={() => table.setDensity('xs')}>set density xs</button>
      <button onClick={() => table.toggleAllRowsSelected()}>select all</button>
      <button onClick={() => table.setShowColumnFilters(true)}>
        open filters
      </button>
      <MantineReactTable table={table} />
    </>
  );
};

/** A separate compiled component that only receives the table instance. */
export const SelectedCountBadge = ({
  table,
}: {
  table: MRT_TableInstance<Person>;
}) => (
  <output data-testid="badge-selected-count">
    {table.getSelectedRowModel().rows.length}
  </output>
);

export const TableWithChildReader = () => {
  const table = useMantineReactTable({
    columns,
    data: people,
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });
  return (
    <>
      <SelectedCountBadge table={table} />
      <MantineReactTable table={table} />
    </>
  );
};

/** State owned by the consumer and passed through `state` + `on*Change`. */
export const ControlledStateTable = () => {
  const [sorting, setSorting] = useState<MRT_SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const table = useMantineReactTable({
    columns,
    data: people,
    getRowId: (row) => row.id,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    state: { globalFilter, sorting },
  });
  return (
    <>
      <output data-testid="sorting">{JSON.stringify(sorting)}</output>
      <button onClick={() => setSorting([{ desc: true, id: 'age' }])}>
        sort age desc
      </button>
      <button onClick={() => setGlobalFilter('Tulsa')}>filter Tulsa</button>
      <MantineReactTable table={table} />
    </>
  );
};

/** New data, new columns and closures over consumer state. */
export const ChangingOptionsTable = () => {
  const [data, setData] = useState(people);
  const [count, setCount] = useState(0);
  const [showCity, setShowCity] = useState(true);
  const [loading, setLoading] = useState(false);

  const visibleColumns: MRT_ColumnDef<Person>[] = showCity
    ? columns
    : columns.filter((column) => column.accessorKey !== 'city');

  const table = useMantineReactTable({
    columns: visibleColumns,
    data,
    getRowId: (row) => row.id,
    renderBottomToolbarCustomActions: () => (
      <output data-testid="bottom-count">{count}</output>
    ),
    renderTopToolbarCustomActions: () => (
      <output data-testid="toolbar-count">{count}</output>
    ),
    state: { showLoadingOverlay: loading },
  });

  return (
    <>
      <button onClick={() => setCount((c) => c + 1)}>increment</button>
      <button onClick={() => setShowCity(false)}>hide city</button>
      <button onClick={() => setLoading((l) => !l)}>toggle loading</button>
      <button
        onClick={() =>
          setData((prev) => [
            ...prev,
            {
              age: 60,
              city: 'Fargo',
              firstName: 'Flo',
              id: `p${prev.length + 1}`,
              lastName: 'Tate',
            },
          ])
        }
      >
        add row
      </button>
      <button onClick={() => setData((prev) => prev.slice(1))}>
        remove first
      </button>
      <MantineReactTable table={table} />
    </>
  );
};

/** The props API, with no table instance in consumer code. */
export const PropsTable = () => {
  const [data, setData] = useState(people);
  return (
    <>
      <button onClick={() => setData((prev) => prev.slice(0, 2))}>
        keep two
      </button>
      <MantineReactTable
        columns={columns}
        data={data}
        enableRowSelection
        getRowId={(row) => row.id}
      />
    </>
  );
};

/** Headless layout built from exported sub-components. */
export const CustomHeadlessTable = () => {
  const table = useMantineReactTable({
    columns,
    data: people,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 2 } },
    paginationDisplayMode: 'pages',
  });
  return (
    <div>
      <MRT_GlobalFilterTextInput table={table} />
      <MRT_ToolbarInternalButtons table={table} />
      <MRT_TableContainer table={table} />
      <MRT_TablePagination table={table} />
      <output data-testid="headless-filters">
        {String(table.getState().showColumnFilters)}
      </output>
      <output data-testid="page-index">
        {table.getState().pagination.pageIndex}
      </output>
    </div>
  );
};

/** Named, compiled components that receive TanStack row and cell objects. */
export const SelectedMarker = ({ row }: { row: MRT_Row<Person> }) => (
  <span data-testid={`marker-${row.id}`}>
    {row.getIsSelected() ? 'selected' : 'idle'}
  </span>
);

export const ExpandedMarker = ({ row }: { row: MRT_Row<Person> }) => (
  <span data-testid={`expanded-${row.id}`}>
    {row.getIsExpanded() ? 'open' : 'closed'}
  </span>
);

export const CellEditingMarker = ({
  cell,
  table,
}: {
  cell: MRT_Cell<Person>;
  table: MRT_TableInstance<Person>;
}) => (
  <span data-testid={`editing-${cell.id}`}>
    {table.getState().editingCell?.id === cell.id ? 'editing' : 'viewing'}
  </span>
);

const markerColumns: MRT_ColumnDef<Person>[] = [
  {
    accessorKey: 'firstName',
    Cell: ({ renderedCellValue, row }) => (
      <>
        {renderedCellValue} <SelectedMarker row={row} />
        <ExpandedMarker row={row} />
      </>
    ),
    header: 'First Name',
  },
  { accessorKey: 'lastName', header: 'Last Name' },
];

export const RowObjectTable = () => {
  const table = useMantineReactTable({
    columns: markerColumns,
    data: people,
    enableRowActions: true,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    renderDetailPanel: ({ row }) => (
      <output data-testid={`detail-${row.id}`}>{row.original.city}</output>
    ),
    renderRowActions: ({ row }) => (
      <Button
        data-testid={`action-${row.id}`}
        onClick={() => row.toggleSelected()}
      >
        {row.getIsSelected() ? 'unselect' : 'select'}
      </Button>
    ),
  });
  return <MantineReactTable table={table} />;
};

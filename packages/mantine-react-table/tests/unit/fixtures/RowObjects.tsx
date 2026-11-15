import { people, type Person } from './data';

/**
 * Compiled consumer components that receive only a TanStack row, cell or
 * column and store a method result in a variable. The React Compiler caches
 * that result on the identity of the object, so these components only stay
 * current when the library hands them a new reference per table snapshot.
 */
import {
  MantineReactTable,
  type MRT_Cell,
  type MRT_Column,
  type MRT_ColumnDef,
  type MRT_Row,
  useMantineReactTable,
} from '@careharmony/mantine-react-table-ng';

export const SelectionToggle = ({ row }: { row: MRT_Row<Person> }) => {
  const selected = row.getIsSelected();
  const label = selected ? 'unselect' : 'select';
  return (
    <button
      data-testid={`toggle-${row.id}`}
      onClick={() => row.toggleSelected(!selected)}
    >
      {label}
    </button>
  );
};

export const ExpansionLabel = ({ row }: { row: MRT_Row<Person> }) => {
  const expanded = row.getIsExpanded();
  const info = { expanded, id: row.id };
  return (
    <span data-testid={`expansion-${info.id}`}>
      {info.expanded ? 'open' : 'closed'}
    </span>
  );
};

export const SortBadge = ({ column }: { column: MRT_Column<Person> }) => {
  const sorted = column.getIsSorted();
  const filterValue = column.getFilterValue();
  return (
    <span data-testid={`sort-${column.id}`}>
      {sorted || 'unsorted'}|{String(filterValue ?? '')}
    </span>
  );
};

export const CellFlags = ({ cell }: { cell: MRT_Cell<Person> }) => {
  const selected = cell.row.getIsSelected();
  const pinned = cell.column.getIsPinned();
  const flags = [selected ? 'selected' : 'idle', pinned || 'unpinned'];
  return <span data-testid={`flags-${cell.id}`}>{flags.join('|')}</span>;
};

export const PinnedFooter = ({ column }: { column: MRT_Column<Person> }) => {
  const pinned = column.getIsPinned();
  return (
    <span data-testid={`footer-${column.id}`}>{pinned || 'unpinned'}</span>
  );
};

const rowObjectColumns: MRT_ColumnDef<Person>[] = [
  {
    accessorKey: 'firstName',
    Cell: ({ cell, renderedCellValue, row }) => (
      <>
        {renderedCellValue} <CellFlags cell={cell} />
        <ExpansionLabel row={row} />
      </>
    ),
    Footer: ({ column }) => <PinnedFooter column={column} />,
    Header: ({ column }) => (
      <>
        First Name <SortBadge column={column} />
      </>
    ),
    header: 'First Name',
  },
  { accessorKey: 'city', header: 'City' },
];

export const RowObjectComponentsTable = () => {
  const table = useMantineReactTable({
    columns: rowObjectColumns,
    data: people,
    enableColumnPinning: true,
    enableRowActions: true,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    initialState: { showColumnFilters: true },
    renderDetailPanel: ({ row }) => (
      <output data-testid={`detail-${row.id}`}>{row.original.city}</output>
    ),
    renderRowActions: ({ row }) => <SelectionToggle row={row} />,
  });
  return (
    <>
      <button onClick={() => table.getColumn('firstName').pin('left')}>
        pin first name
      </button>
      <MantineReactTable table={table} />
    </>
  );
};

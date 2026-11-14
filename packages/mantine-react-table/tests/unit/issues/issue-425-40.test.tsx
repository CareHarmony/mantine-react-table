import { useState } from 'react';

import { columns, people, type Person } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import { screen } from '@testing-library/react';
import {
  MantineReactTable,
  type MRT_ColumnDef,
  useMantineReactTable,
} from 'mantine-react-table-ng';
import { describe, expect, it } from 'vitest';

/** Server-side filtering with filter mode names that are not in filterFns. */
const CustomFilterModeTable = () => {
  const table = useMantineReactTable({
    columns,
    data: people,
    enableColumnFilterModes: true,
    manualFiltering: true,
  });
  return (
    <>
      <output data-testid="internal-mode">
        {String(table.getColumn('firstName').columnDef._filterFn)}
      </output>
      <output data-testid="state-mode">
        {String(table.getState().columnFilterFns.firstName)}
      </output>
      <button
        onClick={() =>
          table.setColumnFilterFns((prev) => ({
            ...prev,
            firstName: 'serverRegex',
          }))
        }
      >
        use serverRegex
      </button>
      <button
        onClick={() =>
          table.setColumnFilterFns((prev) => ({
            ...prev,
            firstName: 'serverPrefix',
          }))
        }
      >
        use serverPrefix
      </button>
      <MantineReactTable table={table} />
    </>
  );
};

const baseColumns: MRT_ColumnDef<Person>[] = [
  { accessorKey: 'firstName', header: 'First Name' },
];
const moreColumns: MRT_ColumnDef<Person>[] = [
  { accessorKey: 'firstName', header: 'First Name' },
  { accessorKey: 'lastName', header: 'Last Name' },
  { accessorKey: 'city', filterFn: 'startsWith', header: 'City' },
  { accessorKey: 'age', filterVariant: 'range', header: 'Age' },
];

/** Columns that arrive after the first render, like columns built from fetched data. */
const LateColumnsTable = () => {
  const [tableColumns, setTableColumns] = useState(baseColumns);
  return (
    <>
      <button onClick={() => setTableColumns(moreColumns)}>add columns</button>
      <MantineReactTable
        columns={tableColumns}
        data={people}
        enableColumnFilterModes
        initialState={{ showColumnFilters: true }}
      />
    </>
  );
};

const filterModeLabels = () =>
  screen.getAllByText(/^Filter Mode:/).map((label) => label.textContent);

describe('issue 425: columnDef._filterFn follows columnFilterFns state', () => {
  it('tracks a filter mode that is not a key of filterFns', async () => {
    const { user } = renderWithMantine(<CustomFilterModeTable />);
    expect(screen.getByTestId('internal-mode')).toHaveTextContent('fuzzy');

    await user.click(screen.getByText('use serverRegex'));
    expect(screen.getByTestId('state-mode')).toHaveTextContent('serverRegex');
    expect(screen.getByTestId('internal-mode')).toHaveTextContent(
      'serverRegex',
    );

    await user.click(screen.getByText('use serverPrefix'));
    expect(screen.getByTestId('internal-mode')).toHaveTextContent(
      'serverPrefix',
    );
  });
});

describe('issue 40: default column filter mode', () => {
  it('gives a column added after the first render a filter mode', async () => {
    const { user } = renderWithMantine(<LateColumnsTable />);
    expect(filterModeLabels()).toEqual(['Filter Mode: Fuzzy']);

    await user.click(screen.getByText('add columns'));
    expect(filterModeLabels()).toEqual([
      'Filter Mode: Fuzzy',
      'Filter Mode: Fuzzy',
      'Filter Mode: Starts With',
      'Filter Mode: Between Inclusive',
    ]);
  });
});

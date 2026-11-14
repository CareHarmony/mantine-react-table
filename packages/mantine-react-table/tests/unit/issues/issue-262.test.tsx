import { people, type Person } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import { screen, waitFor } from '@testing-library/react';
import { MantineReactTable, type MRT_ColumnDef } from 'mantine-react-table-ng';
import { describe, expect, it, vi } from 'vitest';

const cityIsSpy = vi.fn();

const filterFns = {
  cityIs: (
    row: { getValue: (id: string) => unknown },
    id: string,
    filterValue: string,
  ) => {
    cityIsSpy(filterValue);
    return row.getValue(id) === filterValue;
  },
};

const selectColumns: MRT_ColumnDef<Person>[] = [
  { accessorKey: 'firstName', header: 'First Name' },
  {
    accessorKey: 'city',
    filterFn: 'cityIs',
    filterVariant: 'select',
    header: 'City',
    mantineFilterSelectProps: { data: ['Omaha', 'Boise', 'Tulsa'] },
  },
];

const bodyRowCount = () => document.querySelectorAll('tbody tr').length;

describe('issue 262: popover column filters and custom filterFns', () => {
  it.each(['popover', 'subheader'] as const)(
    'runs a custom filterFn from a select filter (%s)',
    async (columnFilterDisplayMode) => {
      const { user } = renderWithMantine(
        <MantineReactTable
          columnFilterDisplayMode={columnFilterDisplayMode}
          columns={selectColumns}
          data={people}
          filterFns={filterFns}
          initialState={{ showColumnFilters: true }}
        />,
      );
      expect(bodyRowCount()).toBe(5);

      if (columnFilterDisplayMode === 'popover') {
        await user.click(screen.getByLabelText('Filter by City'));
      }
      await user.click(await screen.findByPlaceholderText('Filter by City'));
      await user.click(await screen.findByRole('option', { name: 'Boise' }));

      await waitFor(() => expect(bodyRowCount()).toBe(1));
      expect(cityIsSpy).toHaveBeenCalledWith('Boise');
      expect(screen.getByText('Ben')).toBeInTheDocument();
    },
  );
});

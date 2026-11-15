import { useMemo } from 'react';

import {
  MantineReactTable,
  type MRT_ColumnDef,
  useMantineReactTable,
} from '../../src';

import { type Meta } from '@storybook/react';

const meta: Meta = {
  title: 'Fixed Bugs/Range Slider Popover Bug',
};

export default meta;

type Person = {
  city: string;
  name: string;
  salary: number;
  state: string;
};

const data: Person[] = [
  {
    city: 'New York',
    name: 'John Doe',
    salary: 100000,
    state: 'New York',
  },
  {
    city: 'Los Angeles',
    name: 'Jane Smith',
    salary: 80000,
    state: 'California',
  },
  {
    city: 'Chicago',
    name: 'Bob Johnson',
    salary: 120000,
    state: 'Illinois',
  },
  {
    city: 'Houston',
    name: 'Alice Brown',
    salary: 95000,
    state: 'Texas',
  },
];

/**
 * Bug: TypeError: input.select is not a function
 * 
 * Steps to reproduce:
 * 1. Set columnFilterDisplayMode to 'popover'
 * 2. Add a column with filterVariant: 'range-slider'
 * 3. Click the filter icon in the Salary column header
 * 4. Before fix: TypeError would be thrown
 * 5. After fix: Popover opens without error
 * 
 * Root cause: MRT_TableHeadCellFilterLabel.tsx assumed all inputs have select() method
 * Fix: Added type check before calling input.select()
 */
export const RangeSliderPopoverBugFixed = () => {
  const columns = useMemo<MRT_ColumnDef<Person>[]>(
    () => [
      {
        accessorKey: 'name',
        filterVariant: 'text', // This works fine
        header: 'Name',
      },
      {
        accessorKey: 'salary',
        Cell: ({ cell }) =>
          cell.getValue<number>().toLocaleString('en-US', {
            currency: 'USD',
            style: 'currency',
          }),
        filterVariant: 'range-slider', // This caused the bug
        header: 'Salary (Click filter icon to test)',
        mantineFilterRangeSliderProps: {
          color: 'blue',
          label: (value) =>
            value.toLocaleString('en-US', {
              currency: 'USD',
              style: 'currency',
            }),
          step: 10000,
        },
      },
      {
        accessorKey: 'city',
        filterVariant: 'select', // This works fine
        header: 'City',
      },
      {
        accessorKey: 'state',
        filterVariant: 'multi-select', // This works fine
        header: 'State',
      },
    ],
    [],
  );

  const table = useMantineReactTable({
    columnFilterDisplayMode: 'popover', // Required to trigger the bug
    columns,
    data,
    initialState: { showColumnFilters: true },
  });

  return (
    <div>
      <div style={{ backgroundColor: '#f0f8ff', border: '1px solid #0066cc', borderRadius: '4px', marginBottom: '16px', padding: '12px' }}>
        <strong>Bug Test:</strong> Click the filter icon in the "Salary" column header. 
        <br />
        <strong>Before fix:</strong> Would throw "TypeError: input.select is not a function"
        <br />
        <strong>After fix:</strong> Popover opens normally without error
      </div>
      <MantineReactTable table={table} />
    </div>
  );
};
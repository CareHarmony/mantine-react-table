import { renderWithMantine } from '../fixtures/render';

import { screen, waitFor, within } from '@testing-library/react';
import {
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_TableOptions,
  useMantineReactTable,
} from 'mantine-react-table-ng';
import { describe, expect, it } from 'vitest';

type Employee = {
  active: boolean;
  age: number;
  city: string;
  firstName: string;
  hired: string;
};

const employees: Employee[] = [
  {
    active: true,
    age: 31,
    city: 'Omaha',
    firstName: 'Ada',
    hired: '2024-01-15',
  },
  {
    active: false,
    age: 45,
    city: 'Boise',
    firstName: 'Ben',
    hired: '2024-02-20',
  },
  {
    active: true,
    age: 27,
    city: 'Tulsa',
    firstName: 'Cy',
    hired: '2024-03-05',
  },
  {
    active: false,
    age: 52,
    city: 'Akron',
    firstName: 'Dee',
    hired: '2024-01-15',
  },
  {
    active: true,
    age: 38,
    city: 'Reno',
    firstName: 'Eli',
    hired: '2024-04-10',
  },
];

const allNames = employees.map((employee) => employee.firstName);

const nameColumn: MRT_ColumnDef<Employee> = {
  accessorKey: 'firstName',
  header: 'First Name',
};

const UNDEFINED = '<undefined>';

type HarnessProps = {
  data?: Employee[];
} & Omit<MRT_TableOptions<Employee>, 'data'>;

/** Prints the filter state that the table holds, next to the table itself. */
const FilterHarness = ({ data = employees, ...options }: HarnessProps) => {
  const table = useMantineReactTable({
    data,
    ...options,
    initialState: { showColumnFilters: true, ...options.initialState },
  });
  const { columnFilterFns, columnFilters } = table.getState();
  return (
    <>
      <output data-testid="column-filters">
        {JSON.stringify(columnFilters, (_key, value) =>
          value === undefined ? UNDEFINED : value,
        )}
      </output>
      <output data-testid="column-filter-fns">
        {JSON.stringify(columnFilterFns)}
      </output>
      <button onClick={() => table.resetColumnFilters()}>reset filters</button>
      <button
        onClick={() => table.setColumnFilters([{ id: 'age', value: [40, 50] }])}
      >
        set age 40 to 50
      </button>
      <button
        onClick={() =>
          table.setColumnFilters([{ id: 'firstName', value: 'Dee' }])
        }
      >
        set name Dee
      </button>
      <MantineReactTable table={table} />
    </>
  );
};

const columnFilters = (): { id: string; value: unknown }[] =>
  JSON.parse(screen.getByTestId('column-filters').textContent ?? 'null');

const columnFilterFns = (): Record<string, string> =>
  JSON.parse(screen.getByTestId('column-filter-fns').textContent ?? 'null');

/** First names of the body rows that the table currently renders. */
const names = () =>
  Array.from(document.querySelectorAll('tbody tr'))
    .map((tr) => tr.querySelector('td')?.textContent ?? '')
    .filter((name) => allNames.includes(name) || name === 'Fay');

const optionLabels = () =>
  screen.getAllByRole('option').map((option) => option.textContent);

describe(`column filter inputs [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  describe("filterVariant: 'range'", () => {
    const columns: MRT_ColumnDef<Employee>[] = [
      nameColumn,
      { accessorKey: 'age', filterVariant: 'range', header: 'Age' },
    ];

    it('renders a Min and a Max input and filters with betweenInclusive', async () => {
      const { user } = renderWithMantine(<FilterHarness columns={columns} />);
      expect(columnFilterFns().age).toBe('betweenInclusive');

      await user.type(screen.getByPlaceholderText('Min'), '31');
      await waitFor(() =>
        expect(columnFilters()).toEqual([{ id: 'age', value: ['31', ''] }]),
      );
      expect(names()).toEqual(['Ada', 'Ben', 'Dee', 'Eli']);

      await user.type(screen.getByPlaceholderText('Max'), '38');
      await waitFor(() =>
        expect(columnFilters()).toEqual([{ id: 'age', value: ['31', '38'] }]),
      );
      //31 and 38 are both kept, so both bounds are inclusive
      expect(names()).toEqual(['Ada', 'Eli']);
    });

    it('clears one bound with its clear button and keeps the other', async () => {
      const { user } = renderWithMantine(
        <FilterHarness
          columns={columns}
          initialState={{ columnFilters: [{ id: 'age', value: ['31', '38'] }] }}
        />,
      );
      expect(screen.getByPlaceholderText('Min')).toHaveValue('31');
      expect(screen.getByPlaceholderText('Max')).toHaveValue('38');
      expect(names()).toEqual(['Ada', 'Eli']);

      await user.click(screen.getAllByLabelText('Clear filter')[0]);
      await waitFor(() => expect(names()).toEqual(['Ada', 'Cy', 'Eli']));
      expect(screen.getByPlaceholderText('Min')).toHaveValue('');
      expect(screen.getByPlaceholderText('Max')).toHaveValue('38');
      expect(columnFilters()[0].value).toHaveLength(2);
      expect((columnFilters()[0].value as unknown[])[1]).toBe('38');
    });

    it('shows a range that the consumer sets on the table instance', async () => {
      const { user } = renderWithMantine(<FilterHarness columns={columns} />);
      await user.click(screen.getByText('set age 40 to 50'));
      await waitFor(() =>
        expect(screen.getByPlaceholderText('Min')).toHaveValue('40'),
      );
      expect(screen.getByPlaceholderText('Max')).toHaveValue('50');
      expect(names()).toEqual(['Ben']);

      await user.click(screen.getByText('reset filters'));
      await waitFor(() =>
        expect(screen.getByPlaceholderText('Min')).toHaveValue(''),
      );
      expect(screen.getByPlaceholderText('Max')).toHaveValue('');
      expect(names()).toEqual(allNames);
    });
  });

  describe("filterVariant: 'select'", () => {
    const columns: MRT_ColumnDef<Employee>[] = [
      nameColumn,
      { accessorKey: 'city', filterVariant: 'select', header: 'City' },
    ];

    it('lists the faceted values and filters by the chosen one with equals', async () => {
      const { user } = renderWithMantine(
        <FilterHarness columns={columns} enableFacetedValues />,
      );
      expect(columnFilterFns().city).toBe('equals');

      const input = screen.getByPlaceholderText('Filter by City');
      await user.click(input);
      expect(optionLabels()).toEqual([
        'Akron',
        'Boise',
        'Omaha',
        'Reno',
        'Tulsa',
      ]);

      await user.click(screen.getByRole('option', { name: 'Boise' }));
      await waitFor(() =>
        expect(columnFilters()).toEqual([{ id: 'city', value: 'Boise' }]),
      );
      expect(names()).toEqual(['Ben']);
      expect(input).toHaveValue('Boise');
    });

    it('uses mantineFilterSelectProps.data and removes the filter on reset', async () => {
      const { user } = renderWithMantine(
        <FilterHarness
          columns={[
            nameColumn,
            {
              accessorKey: 'city',
              filterVariant: 'select',
              header: 'City',
              mantineFilterSelectProps: { data: ['Reno', 'Tulsa'] },
            },
          ]}
        />,
      );
      const input = screen.getByPlaceholderText('Filter by City');
      await user.click(input);
      expect(optionLabels()).toEqual(['Reno', 'Tulsa']);

      await user.click(screen.getByRole('option', { name: 'Tulsa' }));
      await waitFor(() => expect(names()).toEqual(['Cy']));

      await user.click(screen.getByText('reset filters'));
      await waitFor(() => expect(names()).toEqual(allNames));
      expect(columnFilters()).toEqual([]);
      expect(input).toHaveValue('');
    });
  });

  describe("filterVariant: 'multi-select'", () => {
    const columns: MRT_ColumnDef<Employee>[] = [
      nameColumn,
      { accessorKey: 'city', filterVariant: 'multi-select', header: 'City' },
    ];

    it('keeps the rows that match any chosen value', async () => {
      const { user } = renderWithMantine(
        <FilterHarness columns={columns} enableFacetedValues />,
      );
      expect(columnFilterFns().city).toBe('arrIncludesSome');

      await user.click(screen.getByPlaceholderText('Filter by City'));
      await user.click(screen.getByRole('option', { name: 'Boise' }));
      await waitFor(() =>
        expect(columnFilters()).toEqual([{ id: 'city', value: ['Boise'] }]),
      );
      expect(names()).toEqual(['Ben']);

      await user.click(screen.getByRole('option', { name: 'Reno' }));
      await waitFor(() =>
        expect(columnFilters()).toEqual([
          { id: 'city', value: ['Boise', 'Reno'] },
        ]),
      );
      expect(names()).toEqual(['Ben', 'Eli']);
    });

    it('removes every chosen value with the clear button', async () => {
      const { user } = renderWithMantine(
        <FilterHarness
          columns={columns}
          enableFacetedValues
          initialState={{
            columnFilters: [{ id: 'city', value: ['Akron', 'Omaha'] }],
          }}
        />,
      );
      expect(names()).toEqual(['Ada', 'Dee']);

      await user.click(screen.getByLabelText('Clear filter'));
      await waitFor(() => expect(names()).toEqual(allNames));
      expect(columnFilters()).toEqual([]);
      expect(screen.queryByLabelText('Clear filter')).not.toBeInTheDocument();
    });
  });

  describe("filterVariant: 'autocomplete'", () => {
    const columns: MRT_ColumnDef<Employee>[] = [
      nameColumn,
      { accessorKey: 'city', filterVariant: 'autocomplete', header: 'City' },
    ];

    it('filters by the typed text and by a picked suggestion', async () => {
      const { user } = renderWithMantine(
        <FilterHarness columns={columns} enableFacetedValues />,
      );
      expect(columnFilterFns().city).toBe('fuzzy');

      const input = screen.getByPlaceholderText('Filter by City');
      await user.type(input, 'o');
      await waitFor(() =>
        expect(columnFilters()).toEqual([{ id: 'city', value: 'o' }]),
      );
      expect(names()).toEqual(['Ada', 'Ben', 'Dee', 'Eli']);

      await user.click(screen.getByRole('option', { name: 'Boise' }));
      await waitFor(() =>
        expect(columnFilters()).toEqual([{ id: 'city', value: 'Boise' }]),
      );
      expect(names()).toEqual(['Ben']);
      expect(input).toHaveValue('Boise');
    });

    it('removes the filter with the clear button', async () => {
      const { user } = renderWithMantine(
        <FilterHarness
          columns={columns}
          initialState={{ columnFilters: [{ id: 'city', value: 'Tulsa' }] }}
        />,
      );
      expect(screen.getByPlaceholderText('Filter by City')).toHaveValue(
        'Tulsa',
      );
      expect(names()).toEqual(['Cy']);

      await user.click(screen.getByLabelText('Clear filter'));
      await waitFor(() => expect(columnFilters()).toEqual([]));
      expect(names()).toEqual(allNames);
      expect(screen.getByPlaceholderText('Filter by City')).toHaveValue('');
    });
  });

  describe("filterVariant: 'date'", () => {
    it('filters a column of ISO date strings by the picked day', async () => {
      const { user } = renderWithMantine(
        <FilterHarness
          columns={[
            nameColumn,
            { accessorKey: 'hired', filterVariant: 'date', header: 'Hired' },
          ]}
        />,
      );
      expect(columnFilterFns().hired).toBe('equals');

      const input = screen.getByPlaceholderText('Filter by Hired');
      await user.type(input, 'January 15, 2024');
      await waitFor(() =>
        expect(columnFilters()).toEqual([{ id: 'hired', value: '2024-01-15' }]),
      );
      expect(names()).toEqual(['Ada', 'Dee']);

      await user.clear(input);
      await waitFor(() => expect(columnFilters()).toEqual([]));
      expect(names()).toEqual(allNames);
    });
  });

  describe("filterVariant: 'date-range'", () => {
    it('filters a column of ISO date strings between two picked days', async () => {
      const { user } = renderWithMantine(
        <FilterHarness
          columns={[
            nameColumn,
            {
              accessorKey: 'hired',
              filterVariant: 'date-range',
              header: 'Hired',
            },
          ]}
        />,
      );
      expect(columnFilterFns().hired).toBe('betweenInclusive');

      await user.type(screen.getByPlaceholderText('Min'), 'January 15, 2024');
      await user.type(screen.getByPlaceholderText('Max'), 'March 5, 2024');
      await waitFor(() =>
        expect(columnFilters()).toEqual([
          { id: 'hired', value: ['2024-01-15', '2024-03-05'] },
        ]),
      );
      expect(names()).toEqual(['Ada', 'Ben', 'Cy', 'Dee']);
    });
  });

  describe('date filters on a column of Date objects, as the docs examples define it', () => {
    const hiredAsDate = (
      filterVariant: 'date' | 'date-range',
    ): MRT_ColumnDef<Employee> => ({
      accessorFn: (employee) => new Date(`${employee.hired}T00:00:00`),
      Cell: ({ cell }) => cell.getValue<Date>().toISOString(),
      filterVariant,
      header: 'Hired',
      id: 'hired',
    });

    it("'date' keeps the rows of the picked day", async () => {
      const { user } = renderWithMantine(
        <FilterHarness columns={[nameColumn, hiredAsDate('date')]} />,
      );
      await user.type(
        screen.getByPlaceholderText('Filter by Hired'),
        'January 15, 2024',
      );
      await waitFor(() => expect(columnFilters()).toHaveLength(1));
      expect(names()).toEqual(['Ada', 'Dee']);
    });

    it("'date-range' keeps the rows between the picked days", async () => {
      const { user } = renderWithMantine(
        <FilterHarness columns={[nameColumn, hiredAsDate('date-range')]} />,
      );
      await user.type(screen.getByPlaceholderText('Min'), 'January 15, 2024');
      await user.type(screen.getByPlaceholderText('Max'), 'March 5, 2024');
      await waitFor(() =>
        expect(
          (columnFilters()[0]?.value as undefined | unknown[])?.every(Boolean),
        ).toBe(true),
      );
      expect(names()).toEqual(['Ada', 'Ben', 'Cy', 'Dee']);
    });
  });

  describe('empty and notEmpty filter chip', () => {
    const withBlankCity: Employee[] = [
      ...employees,
      {
        active: true,
        age: 60,
        city: '',
        firstName: 'Fay',
        hired: '2024-05-01',
      },
    ];
    const columns: MRT_ColumnDef<Employee>[] = [
      nameColumn,
      { accessorKey: 'city', header: 'City' },
    ];

    it('replaces the input with a chip and restores the fuzzy mode when the chip is clicked', async () => {
      const { user } = renderWithMantine(
        <FilterHarness
          columns={columns}
          data={withBlankCity}
          enableColumnFilterModes
          initialState={{
            columnFilterFns: { city: 'empty', firstName: 'fuzzy' },
            columnFilters: [{ id: 'city', value: ' ' }],
          }}
        />,
      );
      expect(names()).toEqual(['Fay']);
      expect(
        screen.queryByPlaceholderText('Filter by City'),
      ).not.toBeInTheDocument();

      const chip = document.querySelector('.mantine-Badge-root') as HTMLElement;
      expect(chip).toHaveTextContent('Empty');
      await user.click(within(chip).getByText('Empty'));

      await waitFor(() => expect(columnFilterFns().city).toBe('fuzzy'));
      expect(columnFilters()).toEqual([]);
      expect(names()).toEqual([...allNames, 'Fay']);
      expect(screen.getByPlaceholderText('Filter by City')).toHaveValue('');
    });

    it('falls back to the first allowed filter mode of the column', async () => {
      const { user } = renderWithMantine(
        <FilterHarness
          columns={[
            nameColumn,
            {
              accessorKey: 'city',
              columnFilterModeOptions: ['contains', 'notEmpty'],
              header: 'City',
            },
          ]}
          data={withBlankCity}
          enableColumnFilterModes
          initialState={{
            columnFilterFns: { city: 'notEmpty', firstName: 'fuzzy' },
            columnFilters: [{ id: 'city', value: ' ' }],
          }}
        />,
      );
      expect(names()).toEqual(allNames);

      const chip = document.querySelector('.mantine-Badge-root') as HTMLElement;
      expect(chip).toHaveTextContent('Not Empty');
      await user.click(within(chip).getByText('Not Empty'));

      await waitFor(() => expect(columnFilterFns().city).toBe('contains'));
      expect(columnFilters()).toEqual([]);
      expect(names()).toEqual([...allNames, 'Fay']);
    });
  });

  describe("filterVariant: 'range-slider'", () => {
    const columns: MRT_ColumnDef<Employee>[] = [
      nameColumn,
      { accessorKey: 'age', filterVariant: 'range-slider', header: 'Age' },
    ];

    it('takes its bounds from the faceted min and max of the column', () => {
      renderWithMantine(
        <FilterHarness columns={columns} enableFacetedValues />,
      );
      const [from, to] = screen.getAllByRole('slider');
      expect(from).toHaveAttribute('aria-valuemin', '27');
      expect(from).toHaveAttribute('aria-valuemax', '52');
      expect(from).toHaveAttribute('aria-valuenow', '27');
      expect(to).toHaveAttribute('aria-valuenow', '52');
    });

    it('sets the filter when a thumb moves and removes it at the full range', async () => {
      const { user } = renderWithMantine(
        <FilterHarness columns={columns} enableFacetedValues />,
      );
      const [from] = screen.getAllByRole('slider');
      from.focus();
      await user.keyboard('{ArrowRight}');
      await waitFor(() =>
        expect(columnFilters()).toEqual([{ id: 'age', value: [28, 52] }]),
      );
      expect(names()).toEqual(['Ada', 'Ben', 'Dee', 'Eli']);
      expect(screen.getAllByRole('slider')[0]).toHaveAttribute(
        'aria-valuenow',
        '28',
      );

      await user.keyboard('{ArrowLeft}');
      await waitFor(() => expect(columnFilters()).toEqual([]));
      expect(names()).toEqual(allNames);
    });

    it('follows a filter value that the consumer sets and resets', async () => {
      const { user } = renderWithMantine(
        <FilterHarness columns={columns} enableFacetedValues />,
      );
      await user.click(screen.getByText('set age 40 to 50'));
      await waitFor(() =>
        expect(screen.getAllByRole('slider')[0]).toHaveAttribute(
          'aria-valuenow',
          '40',
        ),
      );
      expect(screen.getAllByRole('slider')[1]).toHaveAttribute(
        'aria-valuenow',
        '50',
      );
      expect(names()).toEqual(['Ben']);

      await user.click(screen.getByText('reset filters'));
      await waitFor(() =>
        expect(screen.getAllByRole('slider')[0]).toHaveAttribute(
          'aria-valuenow',
          '27',
        ),
      );
      expect(screen.getAllByRole('slider')[1]).toHaveAttribute(
        'aria-valuenow',
        '52',
      );
      expect(names()).toEqual(allNames);
    });

    it('prefers the min and max from mantineFilterRangeSliderProps', async () => {
      const { user } = renderWithMantine(
        <FilterHarness
          columns={[
            nameColumn,
            {
              accessorKey: 'age',
              filterVariant: 'range-slider',
              header: 'Age',
              mantineFilterRangeSliderProps: { max: 100, min: 0, step: 40 },
            },
          ]}
        />,
      );
      const [from, to] = screen.getAllByRole('slider');
      expect(from).toHaveAttribute('aria-valuemin', '0');
      expect(to).toHaveAttribute('aria-valuemax', '100');

      from.focus();
      await user.keyboard('{ArrowRight}');
      await waitFor(() =>
        expect(columnFilters()).toEqual([{ id: 'age', value: [40, 100] }]),
      );
      expect(names()).toEqual(['Ben', 'Dee']);
    });
  });

  describe("filterVariant: 'checkbox'", () => {
    const columns: MRT_ColumnDef<Employee>[] = [
      nameColumn,
      {
        accessorKey: 'active',
        Cell: ({ cell }) => String(cell.getValue()),
        filterVariant: 'checkbox',
        header: 'Active',
      },
    ];

    it("cycles no filter, 'true', 'false' and back to no filter", async () => {
      const { user } = renderWithMantine(<FilterHarness columns={columns} />);
      expect(columnFilterFns().active).toBe('equals');
      const checkbox = screen.getByRole('checkbox', {
        name: 'Filter by Active',
      }) as HTMLInputElement;
      expect(checkbox.indeterminate).toBe(true);
      expect(names()).toEqual(allNames);

      await user.click(checkbox);
      await waitFor(() =>
        expect(columnFilters()).toEqual([{ id: 'active', value: 'true' }]),
      );
      expect(names()).toEqual(['Ada', 'Cy', 'Eli']);
      expect(checkbox).toBeChecked();
      expect(checkbox.indeterminate).toBe(false);

      await user.click(checkbox);
      await waitFor(() =>
        expect(columnFilters()).toEqual([{ id: 'active', value: 'false' }]),
      );
      expect(names()).toEqual(['Ben', 'Dee']);
      expect(checkbox).not.toBeChecked();
      expect(checkbox.indeterminate).toBe(false);

      await user.click(checkbox);
      await waitFor(() => expect(columnFilters()).toEqual([]));
      expect(names()).toEqual(allNames);
      expect(checkbox.indeterminate).toBe(true);
    });

    it('labels the checkbox with mantineFilterCheckboxProps.title and calls its onChange', async () => {
      const changes: boolean[] = [];
      const { user } = renderWithMantine(
        <FilterHarness
          columns={columns}
          mantineFilterCheckboxProps={{
            onChange: (event) => changes.push(event.currentTarget.checked),
            title: 'Only active',
          }}
        />,
      );
      await user.click(screen.getByRole('checkbox', { name: 'Only active' }));
      await waitFor(() => expect(names()).toEqual(['Ada', 'Cy', 'Eli']));
      expect(changes).toHaveLength(1);
    });
  });

  describe('text input and custom Filter', () => {
    it('shows a filter value that the consumer sets and clears it on reset', async () => {
      const { user } = renderWithMantine(
        <FilterHarness columns={[nameColumn]} />,
      );
      const input = screen.getByPlaceholderText('Filter by First Name');
      await user.click(screen.getByText('set name Dee'));
      await waitFor(() => expect(input).toHaveValue('Dee'));
      expect(names()).toEqual(['Dee']);

      await user.click(screen.getByText('reset filters'));
      await waitFor(() => expect(input).toHaveValue(''));
      expect(names()).toEqual(allNames);
    });

    it('renders columnDef.Filter in place of the built-in input', async () => {
      const { user } = renderWithMantine(
        <FilterHarness
          columns={[
            {
              ...nameColumn,
              Filter: ({ column }) => (
                <button onClick={() => column.setFilterValue('Cy')}>
                  only Cy
                </button>
              ),
            },
          ]}
        />,
      );
      expect(
        screen.queryByPlaceholderText('Filter by First Name'),
      ).not.toBeInTheDocument();

      await user.click(screen.getByText('only Cy'));
      await waitFor(() =>
        expect(columnFilters()).toEqual([{ id: 'firstName', value: 'Cy' }]),
      );
      expect(names()).toEqual(['Cy']);
    });
  });
});

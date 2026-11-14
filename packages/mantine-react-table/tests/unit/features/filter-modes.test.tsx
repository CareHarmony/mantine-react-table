import { Menu } from '@mantine/core';

import { renderWithMantine } from '../fixtures/render';

import { screen, waitFor } from '@testing-library/react';
import {
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_TableOptions,
  useMantineReactTable,
} from 'mantine-react-table-ng';
import { describe, expect, it } from 'vitest';

type Employee = {
  age: number;
  city: string;
  firstName: string;
};

const employees: Employee[] = [
  { age: 31, city: 'Omaha', firstName: 'Ada' },
  { age: 45, city: 'Boise', firstName: 'Ben' },
  { age: 27, city: 'Tulsa', firstName: 'Cy' },
  { age: 52, city: 'Akron', firstName: 'Dee' },
  { age: 38, city: '', firstName: 'Eli' },
];

const allNames = employees.map((employee) => employee.firstName);

const nameColumn: MRT_ColumnDef<Employee> = {
  accessorKey: 'firstName',
  enableColumnFilterModes: false,
  header: 'First Name',
};

const UNDEFINED = '<undefined>';

/** Prints the filter state that the table holds, next to the table itself. */
const ModesHarness = (options: Omit<MRT_TableOptions<Employee>, 'data'>) => {
  const table = useMantineReactTable({
    data: employees,
    enableColumnFilterModes: true,
    ...options,
    initialState: { showColumnFilters: true, ...options.initialState },
  });
  const { columnFilterFns, columnFilters, globalFilter, globalFilterFn } =
    table.getState();
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
      <output data-testid="global-filter">{String(globalFilter)}</output>
      <output data-testid="global-filter-fn">{String(globalFilterFn)}</output>
      <MantineReactTable table={table} />
    </>
  );
};

const columnFilters = (): { id: string; value: unknown }[] =>
  JSON.parse(screen.getByTestId('column-filters').textContent ?? 'null');

const columnFilterFns = (): Record<string, string> =>
  JSON.parse(screen.getByTestId('column-filter-fns').textContent ?? 'null');

const names = () =>
  Array.from(document.querySelectorAll('tbody tr'))
    .map((tr) => tr.querySelector('td')?.textContent ?? '')
    .filter((name) => allNames.includes(name));

const menuItemLabels = () =>
  screen
    .getAllByRole('menuitem')
    .map((item) => item.querySelector('.mantine-Menu-itemLabel')?.textContent);

/** The accessible name of a built-in item also holds its symbol, so match the label element. */
const findMenuItem = async (label: string) =>
  waitFor(() => {
    const item = screen
      .getAllByRole('menuitem')
      .find(
        (el) =>
          el.querySelector('.mantine-Menu-itemLabel')?.textContent === label,
      );
    if (!item) throw new Error(`no menu item labelled ${label}`);
    return item;
  });

type User = ReturnType<typeof renderWithMantine>['user'];

/** Opens the single column filter mode menu and clicks one of its items. */
const selectColumnFilterMode = async (user: User, label: string) => {
  await user.click(screen.getByLabelText('Change filter mode'));
  await user.click(await findMenuItem(label));
};

describe(`filter modes [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  describe('column filter mode menu', () => {
    const columns: MRT_ColumnDef<Employee>[] = [
      nameColumn,
      { accessorKey: 'city', header: 'City' },
    ];

    it('lists the 14 MRT filter modes and labels the current one', async () => {
      const { user } = renderWithMantine(<ModesHarness columns={columns} />);
      expect(screen.getByText('Filter Mode: Fuzzy')).toBeInTheDocument();

      await user.click(screen.getByLabelText('Change filter mode'));
      await findMenuItem('Contains');
      expect(menuItemLabels()).toEqual([
        'Fuzzy',
        'Contains',
        'Starts With',
        'Ends With',
        'Equals',
        'Not Equals',
        'Between',
        'Between Inclusive',
        'Greater Than',
        'Greater Than Or Equal To',
        'Less Than',
        'Less Than Or Equal To',
        'Empty',
        'Not Empty',
      ]);
    });

    it('limits the menu to columnFilterModeOptions', async () => {
      const { user } = renderWithMantine(
        <ModesHarness
          columnFilterModeOptions={['contains', 'startsWith', 'endsWith']}
          columns={columns}
        />,
      );
      await user.click(screen.getByLabelText('Change filter mode'));
      await findMenuItem('Contains');
      expect(menuItemLabels()).toEqual([
        'Contains',
        'Starts With',
        'Ends With',
      ]);
    });

    it('keeps the typed value when one single-value mode replaces another', async () => {
      const { user } = renderWithMantine(
        <ModesHarness
          columns={columns}
          initialState={{ columnFilterFns: { city: 'contains' } }}
        />,
      );
      await user.type(screen.getByPlaceholderText('Filter by City'), 'o');
      await waitFor(() =>
        expect(columnFilters()).toEqual([{ id: 'city', value: 'o' }]),
      );
      expect(names()).toEqual(['Ada', 'Ben', 'Dee']);

      await selectColumnFilterMode(user, 'Starts With');
      await waitFor(() => expect(columnFilterFns().city).toBe('startsWith'));
      expect(columnFilters()).toEqual([{ id: 'city', value: 'o' }]);
      expect(names()).toEqual(['Ada']);
      expect(screen.getByText('Filter Mode: Starts With')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Filter by City')).toHaveValue('o');

      await selectColumnFilterMode(user, 'Ends With');
      await waitFor(() => expect(columnFilterFns().city).toBe('endsWith'));
      expect(columnFilters()).toEqual([{ id: 'city', value: 'o' }]);
      expect(names()).toEqual([]);
    });

    it('changes nothing when the current mode is selected again', async () => {
      const { user } = renderWithMantine(
        <ModesHarness
          columns={columns}
          initialState={{
            columnFilterFns: { city: 'contains' },
            columnFilters: [{ id: 'city', value: 'o' }],
          }}
        />,
      );
      await selectColumnFilterMode(user, 'Contains');
      await waitFor(() =>
        expect(screen.queryByRole('menuitem')).not.toBeInTheDocument(),
      );
      expect(columnFilterFns().city).toBe('contains');
      expect(columnFilters()).toEqual([{ id: 'city', value: 'o' }]);
      expect(names()).toEqual(['Ada', 'Ben', 'Dee']);
    });

    it('replaces a text value with an empty range when a range mode is selected', async () => {
      const { user } = renderWithMantine(
        <ModesHarness
          columns={columns}
          initialState={{ columnFilters: [{ id: 'city', value: 'o' }] }}
        />,
      );
      expect(names()).toEqual(['Ada', 'Ben', 'Dee']);

      await selectColumnFilterMode(user, 'Between');
      await waitFor(() => expect(columnFilterFns().city).toBe('between'));
      expect(columnFilters()).toEqual([{ id: 'city', value: ['', ''] }]);
      expect(names()).toEqual(allNames);
      expect(screen.getByPlaceholderText('Min')).toHaveValue('');
      expect(screen.getByPlaceholderText('Max')).toHaveValue('');
      expect(
        screen.queryByPlaceholderText('Filter by City'),
      ).not.toBeInTheDocument();
    });

    it('keeps the range when one range mode replaces another', async () => {
      const { user } = renderWithMantine(
        <ModesHarness
          columns={[nameColumn, { accessorKey: 'age', header: 'Age' }]}
          initialState={{
            columnFilterFns: { age: 'between' },
            columnFilters: [{ id: 'age', value: ['31', '45'] }],
          }}
        />,
      );
      expect(names()).toEqual(['Eli']);

      await selectColumnFilterMode(user, 'Between Inclusive');
      await waitFor(() =>
        expect(columnFilterFns().age).toBe('betweenInclusive'),
      );
      expect(columnFilters()).toEqual([{ id: 'age', value: ['31', '45'] }]);
      expect(names()).toEqual(['Ada', 'Ben', 'Eli']);
      expect(screen.getByPlaceholderText('Min')).toHaveValue('31');
      expect(screen.getByPlaceholderText('Max')).toHaveValue('45');
    });

    it('replaces a range with an empty text value when a single-value mode is selected', async () => {
      const { user } = renderWithMantine(
        <ModesHarness
          columns={[nameColumn, { accessorKey: 'age', header: 'Age' }]}
          initialState={{
            columnFilterFns: { age: 'between' },
            columnFilters: [{ id: 'age', value: ['31', '45'] }],
          }}
        />,
      );
      await selectColumnFilterMode(user, 'Greater Than');
      await waitFor(() => expect(columnFilterFns().age).toBe('greaterThan'));
      await waitFor(() => expect(columnFilters()).toEqual([]));
      expect(names()).toEqual(allNames);
      const input = screen.getByPlaceholderText('Filter by Age');
      expect(input).toHaveValue('');

      await user.type(input, '40');
      await waitFor(() =>
        expect(columnFilters()).toEqual([{ id: 'age', value: '40' }]),
      );
      expect(names()).toEqual(['Ben', 'Dee']);
    });

    it('stores a single space for the empty mode and shows the chip', async () => {
      const { user } = renderWithMantine(
        <ModesHarness
          columns={columns}
          initialState={{ columnFilters: [{ id: 'city', value: 'o' }] }}
        />,
      );
      await selectColumnFilterMode(user, 'Empty');
      await waitFor(() => expect(columnFilterFns().city).toBe('empty'));
      expect(columnFilters()).toEqual([{ id: 'city', value: ' ' }]);
      expect(names()).toEqual(['Eli']);
      expect(
        screen.queryByPlaceholderText('Filter by City'),
      ).not.toBeInTheDocument();
      expect(document.querySelector('.mantine-Badge-root')).toHaveTextContent(
        'Empty',
      );
    });

    it('keeps the single space between empty and notEmpty and drops it for a text mode', async () => {
      const { user } = renderWithMantine(
        <ModesHarness
          columns={columns}
          initialState={{
            columnFilterFns: { city: 'empty' },
            columnFilters: [{ id: 'city', value: ' ' }],
          }}
        />,
      );
      expect(names()).toEqual(['Eli']);

      await selectColumnFilterMode(user, 'Not Empty');
      await waitFor(() => expect(columnFilterFns().city).toBe('notEmpty'));
      expect(columnFilters()).toEqual([{ id: 'city', value: ' ' }]);
      expect(names()).toEqual(['Ada', 'Ben', 'Cy', 'Dee']);
      expect(document.querySelector('.mantine-Badge-root')).toHaveTextContent(
        'Not Empty',
      );

      await selectColumnFilterMode(user, 'Contains');
      await waitFor(() => expect(columnFilterFns().city).toBe('contains'));
      await waitFor(() => expect(columnFilters()).toEqual([]));
      expect(names()).toEqual(allNames);
      expect(screen.getByPlaceholderText('Filter by City')).toHaveValue('');
    });

    it('sets the single space when empty is selected with no filter value', async () => {
      const { user } = renderWithMantine(<ModesHarness columns={columns} />);
      await selectColumnFilterMode(user, 'Not Empty');
      await waitFor(() =>
        expect(columnFilters()).toEqual([{ id: 'city', value: ' ' }]),
      );
      expect(columnFilterFns().city).toBe('notEmpty');
      expect(names()).toEqual(['Ada', 'Ben', 'Cy', 'Dee']);
    });
  });

  describe('column filter mode menu on other filter variants', () => {
    it("offers only the range modes for filterVariant: 'range'", async () => {
      const { user } = renderWithMantine(
        <ModesHarness
          columns={[
            nameColumn,
            { accessorKey: 'age', filterVariant: 'range', header: 'Age' },
          ]}
          initialState={{ columnFilters: [{ id: 'age', value: ['31', '45'] }] }}
        />,
      );
      expect(columnFilterFns().age).toBe('betweenInclusive');
      expect(names()).toEqual(['Ada', 'Ben', 'Eli']);

      await user.click(screen.getByLabelText('Change filter mode'));
      await findMenuItem('Between');
      expect(menuItemLabels()).toEqual(['Between', 'Between Inclusive']);

      await user.click(await findMenuItem('Between'));
      await waitFor(() => expect(columnFilterFns().age).toBe('between'));
      expect(columnFilters()).toEqual([{ id: 'age', value: ['31', '45'] }]);
      expect(names()).toEqual(['Eli']);
    });

    //a function, because the table writes the chosen mode onto the column definitions
    const multiSelectTable = () => (
      <ModesHarness
        columns={[
          nameColumn,
          {
            accessorKey: 'city',
            filterVariant: 'multi-select',
            header: 'City',
            mantineFilterMultiSelectProps: {
              data: ['Akron', 'Boise', 'Omaha', 'Tulsa'],
            },
          },
        ]}
        initialState={{ columnFilters: [{ id: 'city', value: ['Boise'] }] }}
      />
    );

    it("empties the chosen values of filterVariant: 'multi-select' when the mode changes", async () => {
      const { user } = renderWithMantine(multiSelectTable());
      expect(columnFilterFns().city).toBe('arrIncludesSome');
      expect(names()).toEqual(['Ben']);
      const chosen = () =>
        Array.from(document.querySelectorAll('.mantine-Pill-label')).map(
          (pill) => pill.textContent,
        );
      expect(chosen()).toEqual(['Boise']);

      await selectColumnFilterMode(user, 'Equals');
      await waitFor(() => expect(columnFilterFns().city).toBe('equals'));
      await waitFor(() => expect(columnFilters()).toEqual([]));
      await waitFor(() => expect(chosen()).toEqual([]));
    });

    it("shows every row after the mode change emptied a 'multi-select' filter", async () => {
      const { user } = renderWithMantine(multiSelectTable());
      await selectColumnFilterMode(user, 'Equals');
      await waitFor(() => expect(columnFilterFns().city).toBe('equals'));
      await waitFor(() => expect(columnFilters()).toEqual([]));
      expect(names()).toEqual(allNames);
    });
  });

  describe('custom filter mode menu items', () => {
    it('passes onSelectFilterMode and the internal options to renderColumnFilterModeMenuItems', async () => {
      const { user } = renderWithMantine(
        <ModesHarness
          columns={[nameColumn, { accessorKey: 'city', header: 'City' }]}
          initialState={{ columnFilters: [{ id: 'city', value: 'a' }] }}
          renderColumnFilterModeMenuItems={({
            internalFilterOptions,
            onSelectFilterMode,
          }) => (
            <>
              <Menu.Label>{internalFilterOptions.length} modes</Menu.Label>
              <Menu.Item onClick={() => onSelectFilterMode('endsWith')}>
                Custom ends with
              </Menu.Item>
            </>
          )}
        />,
      );
      await user.click(screen.getByLabelText('Change filter mode'));
      expect(await screen.findByText('14 modes')).toBeInTheDocument();
      expect(menuItemLabels()).toEqual(['Custom ends with']);

      await user.click(
        screen.getByRole('menuitem', { name: 'Custom ends with' }),
      );
      await waitFor(() => expect(columnFilterFns().city).toBe('endsWith'));
      expect(columnFilters()).toEqual([{ id: 'city', value: 'a' }]);
      expect(names()).toEqual(['Ada', 'Cy']);
    });

    it('prefers the renderColumnFilterModeMenuItems of the column', async () => {
      const { user } = renderWithMantine(
        <ModesHarness
          columns={[
            nameColumn,
            {
              accessorKey: 'city',
              header: 'City',
              renderColumnFilterModeMenuItems: ({ onSelectFilterMode }) => (
                <Menu.Item onClick={() => onSelectFilterMode('notEquals')}>
                  Column item
                </Menu.Item>
              ),
            },
          ]}
          initialState={{ columnFilters: [{ id: 'city', value: 'omaha' }] }}
          renderColumnFilterModeMenuItems={() => (
            <Menu.Item>Table item</Menu.Item>
          )}
        />,
      );
      await user.click(screen.getByLabelText('Change filter mode'));
      await screen.findByRole('menuitem', { name: 'Column item' });
      expect(menuItemLabels()).toEqual(['Column item']);

      await user.click(screen.getByRole('menuitem', { name: 'Column item' }));
      await waitFor(() => expect(columnFilterFns().city).toBe('notEquals'));
      expect(names()).toEqual(['Ben', 'Cy', 'Dee', 'Eli']);
    });
  });

  describe('global filter mode menu', () => {
    const columns: MRT_ColumnDef<Employee>[] = [
      { accessorKey: 'firstName', header: 'First Name' },
      { accessorKey: 'city', header: 'City' },
    ];
    const globalFilterFn = () =>
      screen.getByTestId('global-filter-fn').textContent;
    const globalFilter = () => screen.getByTestId('global-filter').textContent;

    it('lists fuzzy, contains and startsWith and applies the chosen mode', async () => {
      const { user } = renderWithMantine(
        <ModesHarness
          columns={columns}
          enableColumnFilterModes={false}
          enableGlobalFilterModes
          initialState={{ showGlobalFilter: true }}
        />,
      );
      expect(globalFilterFn()).toBe('fuzzy');

      await user.click(screen.getByLabelText('Change search mode'));
      await findMenuItem('Starts With');
      expect(menuItemLabels()).toEqual(['Fuzzy', 'Contains', 'Starts With']);

      await user.click(await findMenuItem('Starts With'));
      await waitFor(() => expect(globalFilterFn()).toBe('startsWith'));

      await user.type(screen.getByPlaceholderText('Search'), 'a');
      await waitFor(() => expect(globalFilter()).toBe('a'));
      //Ada by first name, Dee by city Akron
      expect(names()).toEqual(['Ada', 'Dee']);
    });

    it('clears the search text when the mode changes', async () => {
      const { user } = renderWithMantine(
        <ModesHarness
          columns={columns}
          enableColumnFilterModes={false}
          enableGlobalFilterModes
          initialState={{ globalFilter: 'an', showGlobalFilter: true }}
        />,
      );
      const search = screen.getByPlaceholderText('Search');
      expect(search).toHaveValue('an');
      //fuzzy matches "an" inside "Akron"
      expect(names()).toEqual(['Dee']);

      await user.click(screen.getByLabelText('Change search mode'));
      await user.click(await findMenuItem('Contains'));
      await waitFor(() => expect(globalFilterFn()).toBe('contains'));
      await waitFor(() => expect(search).toHaveValue(''));
      expect(globalFilter()).toBe('undefined');
      expect(names()).toEqual(allNames);

      await user.type(search, 'ko');
      await waitFor(() => expect(globalFilter()).toBe('ko'));
      //contains needs the letters next to each other, fuzzy would match "Akron"
      expect(names()).toEqual([]);
    });

    it('limits the menu to globalFilterModeOptions and supports custom items', async () => {
      const { user } = renderWithMantine(
        <ModesHarness
          columns={columns}
          enableColumnFilterModes={false}
          enableGlobalFilterModes
          globalFilterModeOptions={['contains', 'endsWith']}
          initialState={{ showGlobalFilter: true }}
          renderGlobalFilterModeMenuItems={({
            internalFilterOptions,
            onSelectFilterMode,
          }) =>
            internalFilterOptions.map(({ label, option }) => (
              <Menu.Item
                key={option}
                onClick={() => onSelectFilterMode(option)}
              >
                Search: {label}
              </Menu.Item>
            ))
          }
        />,
      );
      await user.click(screen.getByLabelText('Change search mode'));
      await screen.findByRole('menuitem', { name: 'Search: Ends With' });
      expect(menuItemLabels()).toEqual([
        'Search: Contains',
        'Search: Ends With',
      ]);

      await user.click(
        screen.getByRole('menuitem', { name: 'Search: Ends With' }),
      );
      await waitFor(() => expect(globalFilterFn()).toBe('endsWith'));

      await user.type(screen.getByPlaceholderText('Search'), 'a');
      await waitFor(() => expect(globalFilter()).toBe('a'));
      //Ada by first name; Omaha and Tulsa by city
      expect(names()).toEqual(['Ada', 'Cy']);
    });
  });
});

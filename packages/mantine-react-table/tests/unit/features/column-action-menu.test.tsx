import { Menu } from '@mantine/core';

import { columns, people, type Person } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { type UserEvent } from '@testing-library/user-event';
import {
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_TableOptions,
  useMantineReactTable,
} from 'mantine-react-table-ng';
import { describe, expect, it, vi } from 'vitest';

const getRowId = (row: Person) => row.id;

//prints the table state next to the table, like a consumer that reads `table.getState()`
const StateTable = (options: Partial<MRT_TableOptions<Person>>) => {
  const table = useMantineReactTable({
    columns,
    data: people,
    getRowId,
    ...options,
  });
  const {
    columnFilters,
    columnOrder,
    columnPinning,
    columnSizing,
    columnSizingInfo,
    columnVisibility,
    grouping,
    showColumnFilters,
    sorting,
  } = table.getState();
  return (
    <>
      <output data-testid="state">
        {JSON.stringify({
          columnFilters,
          columnOrder,
          columnPinning,
          columnSizing,
          columnVisibility,
          grouping,
          isResizingColumn: columnSizingInfo.isResizingColumn,
          showColumnFilters,
          sorting,
        })}
      </output>
      <MantineReactTable table={table} />
    </>
  );
};

const state = () => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

const bodyRows = () =>
  screen.getAllByRole('row').filter((row) => row.closest('tbody'));

const firstNames = () =>
  bodyRows().map((row) => within(row).getAllByRole('cell')[0].textContent);

const headerText = () =>
  screen
    .getAllByRole('columnheader')
    .map((header) => header.textContent?.trim())
    .filter(Boolean);

const headerCell = (name: string) => {
  const cell = screen
    .getAllByRole('columnheader')
    .find((header) => header.textContent?.trim() === name);
  if (!cell) throw new Error(`no "${name}" header`);
  return cell;
};

const openMenu = async (user: UserEvent, columnName: string) => {
  await user.click(
    within(headerCell(columnName)).getByRole('button', {
      name: 'Column Actions',
    }),
  );
  return screen.findByRole('menu');
};

const isShown = (element: HTMLElement) => {
  for (let node: HTMLElement | null = element; node; node = node.parentElement)
    if (getComputedStyle(node).display === 'none') return false;
  return true;
};

const menuItem = (name: string) => screen.getByRole('menuitem', { name });

const chooseItem = async (
  user: UserEvent,
  columnName: string,
  itemName: string,
) => {
  await openMenu(user, columnName);
  await user.click(menuItem(itemName));
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
};

describe(`column actions menu [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  describe('sorting', () => {
    it('sorts ascending and disables the ascending item', async () => {
      const { user } = renderWithMantine(<StateTable />);
      expect(firstNames()).toEqual(['Ada', 'Ben', 'Cy', 'Dee', 'Eli']);

      await openMenu(user, 'Age');
      expect(menuItem('Clear sort')).toBeDisabled();
      expect(menuItem('Sort by Age ascending')).toBeEnabled();
      await user.click(menuItem('Sort by Age ascending'));

      await waitFor(() =>
        expect(firstNames()).toEqual(['Cy', 'Ada', 'Eli', 'Ben', 'Dee']),
      );
      expect(state().sorting).toEqual([{ desc: false, id: 'age' }]);

      await openMenu(user, 'Age');
      expect(menuItem('Sort by Age ascending')).toBeDisabled();
      expect(menuItem('Sort by Age descending')).toBeEnabled();
      expect(menuItem('Clear sort')).toBeEnabled();
    });

    it('sorts descending and disables the descending item', async () => {
      const { user } = renderWithMantine(<StateTable />);
      await chooseItem(user, 'Age', 'Sort by Age descending');

      await waitFor(() =>
        expect(firstNames()).toEqual(['Dee', 'Ben', 'Eli', 'Ada', 'Cy']),
      );
      expect(state().sorting).toEqual([{ desc: true, id: 'age' }]);

      await openMenu(user, 'Age');
      expect(menuItem('Sort by Age descending')).toBeDisabled();
      expect(menuItem('Sort by Age ascending')).toBeEnabled();
    });

    it('clears the sort and restores the data order', async () => {
      const { user } = renderWithMantine(
        <StateTable
          initialState={{ sorting: [{ desc: true, id: 'lastName' }] }}
        />,
      );
      expect(firstNames()).toEqual(['Ada', 'Ben', 'Cy', 'Dee', 'Eli']);
      await chooseItem(user, 'City', 'Sort by City ascending');
      await waitFor(() =>
        expect(firstNames()).toEqual(['Dee', 'Ben', 'Ada', 'Eli', 'Cy']),
      );

      await chooseItem(user, 'City', 'Clear sort');
      await waitFor(() => expect(state().sorting).toEqual([]));
      expect(firstNames()).toEqual(['Ada', 'Ben', 'Cy', 'Dee', 'Eli']);
    });

    it('omits the clear item when sorting removal is off', async () => {
      const { user } = renderWithMantine(
        <StateTable enableSortingRemoval={false} />,
      );
      await openMenu(user, 'Age');
      expect(screen.queryByRole('menuitem', { name: 'Clear sort' })).toBeNull();
      expect(menuItem('Sort by Age ascending')).toBeInTheDocument();
    });

    it('omits the sort items when sorting is off', async () => {
      const { user } = renderWithMantine(<StateTable enableSorting={false} />);
      await openMenu(user, 'Age');
      expect(
        screen.queryByRole('menuitem', { name: 'Sort by Age ascending' }),
      ).toBeNull();
      expect(menuItem('Hide Age column')).toBeInTheDocument();
    });
  });

  describe('column size', () => {
    it('resets the size of a resized column', async () => {
      const { user } = renderWithMantine(
        <StateTable
          enableColumnResizing
          initialState={{ columnSizing: { age: 320 } }}
        />,
      );
      expect(state().columnSizing).toEqual({ age: 320 });

      await openMenu(user, 'City');
      expect(menuItem('Reset column size')).toBeDisabled();
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

      await openMenu(user, 'Age');
      expect(menuItem('Reset column size')).toBeEnabled();
      await user.click(menuItem('Reset column size'));

      await waitFor(() => expect(state().columnSizing).toEqual({}));
      expect(state().isResizingColumn).toBe(false);
      await openMenu(user, 'Age');
      expect(menuItem('Reset column size')).toBeDisabled();
    });

    it('has no reset item when resizing is off', async () => {
      const { user } = renderWithMantine(<StateTable />);
      await openMenu(user, 'Age');
      expect(
        screen.queryByRole('menuitem', { name: 'Reset column size' }),
      ).toBeNull();
    });
  });

  describe('column pinning', () => {
    it('pins left, pins right and unpins', async () => {
      const { user } = renderWithMantine(<StateTable enableColumnPinning />);
      expect(document.querySelector('th[data-column-pinned]')).toBeNull();

      await openMenu(user, 'Age');
      expect(menuItem('Unpin')).toBeDisabled();
      await user.click(menuItem('Pin to left'));
      await waitFor(() =>
        expect(headerCell('Age')).toHaveAttribute('data-column-pinned', 'left'),
      );
      expect(headerText()).toEqual(['Age', 'First Name', 'Last Name', 'City']);
      expect(state().columnPinning.left).toContain('age');
      expect(
        Array.from(document.querySelectorAll('td[data-column-pinned="left"]'))
          .map((cell) => cell.textContent)
          .slice(0, 2),
      ).toEqual(['31', '45']);

      await openMenu(user, 'Age');
      expect(menuItem('Pin to left')).toBeDisabled();
      expect(menuItem('Unpin')).toBeEnabled();
      await user.click(menuItem('Pin to right'));
      await waitFor(() =>
        expect(headerCell('Age')).toHaveAttribute(
          'data-column-pinned',
          'right',
        ),
      );
      expect(headerText()).toEqual(['First Name', 'Last Name', 'City', 'Age']);
      expect(state().columnPinning.right).toEqual(['age']);
      expect(state().columnPinning.left).not.toContain('age');

      await openMenu(user, 'Age');
      expect(menuItem('Pin to right')).toBeDisabled();
      await user.click(menuItem('Unpin'));
      await waitFor(() =>
        expect(document.querySelector('th[data-column-pinned]')).toBeNull(),
      );
      expect(headerText()).toEqual(['First Name', 'Last Name', 'Age', 'City']);
      expect(state().columnPinning.right).toEqual([]);
    });

    it('has no pin items for a column that cannot be pinned', async () => {
      const unpinnable: MRT_ColumnDef<Person>[] = columns.map((column) =>
        column.accessorKey === 'age'
          ? { ...column, enablePinning: false }
          : column,
      );
      const { user } = renderWithMantine(
        <StateTable columns={unpinnable} enableColumnPinning />,
      );
      await openMenu(user, 'Age');
      expect(
        screen.queryByRole('menuitem', { name: 'Pin to left' }),
      ).toBeNull();
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
      await openMenu(user, 'City');
      expect(menuItem('Pin to left')).toBeEnabled();
    });
  });

  describe('grouping', () => {
    it('groups by the column, then ungroups', async () => {
      const { user } = renderWithMantine(<StateTable enableGrouping />);
      await chooseItem(user, 'City', 'Group by City');

      await waitFor(() => expect(state().grouping).toEqual(['city']));
      expect(state().columnOrder[0]).toBe('mrt-row-expand');
      expect(bodyRows()).toHaveLength(5);
      expect(screen.getByText(/Omaha\s*\(1\)/)).toBeInTheDocument();
      //group rows aggregate, so the leaf values are not rendered until expanded
      expect(screen.queryByText('Ada')).toBeNull();

      await chooseItem(user, 'City', 'Ungroup by City');
      await waitFor(() => expect(state().grouping).toEqual([]));
      expect(screen.getByText('Ada')).toBeInTheDocument();
      expect(screen.queryByText(/Omaha\s*\(1\)/)).toBeNull();
    });
  });

  describe('filtering', () => {
    it('clears the filter of the column', async () => {
      const { user } = renderWithMantine(
        <StateTable
          initialState={{ columnFilters: [{ id: 'city', value: 'reno' }] }}
        />,
      );
      expect(firstNames()).toEqual(['Eli']);

      await openMenu(user, 'Age');
      expect(menuItem('Clear filter')).toBeDisabled();
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

      await chooseItem(user, 'City', 'Clear filter');
      await waitFor(() =>
        expect(firstNames()).toEqual(['Ada', 'Ben', 'Cy', 'Dee', 'Eli']),
      );
      expect(state().columnFilters).toEqual([]);
    });

    it('opens the column filters and focuses the filter of the column', async () => {
      const { user } = renderWithMantine(<StateTable />);
      expect(state().showColumnFilters).toBe(false);
      //the filter row is mounted inside a closed Collapse until filters are shown
      expect(screen.getByPlaceholderText('Filter by City')).not.toBeVisible();

      await openMenu(user, 'City');
      const input = screen.getByPlaceholderText('Filter by City');
      //The menu focuses the filter 100ms after the click and jsdom cannot focus an
      //input inside a closed Collapse. Fake timers hold that 100ms timer until the
      //Collapse is open, whatever the load on the machine.
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        fireEvent.click(menuItem('Filter by City'));
        //the Menu returns focus to its target 10ms after it closes
        act(() => {
          vi.advanceTimersByTime(50);
        });
        expect(
          within(headerCell('City')).getByRole('button', {
            name: 'Column Actions',
          }),
        ).toHaveFocus();
        for (let turn = 0; turn < 500 && !isShown(input); turn++) {
          await act(() => new Promise((resolve) => setImmediate(resolve)));
        }
        expect(input).toBeVisible();
        expect(input).not.toHaveFocus();
        act(() => {
          vi.advanceTimersByTime(60);
        });
      } finally {
        vi.useRealTimers();
      }

      expect(input).toHaveFocus();
      expect(state().showColumnFilters).toBe(true);
      expect(screen.getByPlaceholderText('Filter by Age')).toBeVisible();
    });

    it('has no filter items in the popover filter display mode', async () => {
      const { user } = renderWithMantine(
        <StateTable columnFilterDisplayMode="popover" />,
      );
      await openMenu(user, 'City');
      expect(
        screen.queryByRole('menuitem', { name: 'Filter by City' }),
      ).toBeNull();
      expect(
        screen.queryByRole('menuitem', { name: 'Clear filter' }),
      ).toBeNull();
    });
  });

  describe('visibility', () => {
    it('hides the column', async () => {
      const { user } = renderWithMantine(<StateTable />);
      await openMenu(user, 'Age');
      expect(menuItem('Show all columns')).toBeDisabled();
      await user.click(menuItem('Hide Age column'));

      await waitFor(() =>
        expect(headerText()).toEqual(['First Name', 'Last Name', 'City']),
      );
      expect(state().columnVisibility).toEqual({ age: false });
      expect(screen.queryByText('31')).toBeNull();
    });

    it('disables the hide item for a column that cannot be hidden', async () => {
      const unhideable: MRT_ColumnDef<Person>[] = columns.map((column) =>
        column.accessorKey === 'age'
          ? { ...column, enableHiding: false }
          : column,
      );
      const { user } = renderWithMantine(<StateTable columns={unhideable} />);
      await openMenu(user, 'Age');
      expect(menuItem('Hide Age column')).toBeDisabled();
    });

    it('shows all hidden columns', async () => {
      const { user } = renderWithMantine(
        <StateTable
          initialState={{ columnVisibility: { age: false, city: false } }}
        />,
      );
      expect(headerText()).toEqual(['First Name', 'Last Name']);

      await openMenu(user, 'Last Name');
      expect(menuItem('Show all columns')).toBeEnabled();
      await user.click(menuItem('Show all columns'));

      await waitFor(() =>
        expect(headerText()).toEqual([
          'First Name',
          'Last Name',
          'Age',
          'City',
        ]),
      );
      expect(
        Object.values(state().columnVisibility).every((visible) => visible),
      ).toBe(true);
    });
  });

  describe('custom menu items', () => {
    it('renders table-level items next to the internal items', async () => {
      const { user } = renderWithMantine(
        <StateTable
          renderColumnActionsMenuItems={({
            column,
            internalColumnMenuItems,
          }) => (
            <>
              {internalColumnMenuItems}
              <Menu.Item onClick={() => column.toggleSorting(true)}>
                Custom for {column.id}
              </Menu.Item>
            </>
          )}
        />,
      );
      await openMenu(user, 'Age');
      expect(menuItem('Hide Age column')).toBeInTheDocument();
      await user.click(menuItem('Custom for age'));
      await waitFor(() =>
        expect(firstNames()).toEqual(['Dee', 'Ben', 'Eli', 'Ada', 'Cy']),
      );
    });

    it('prefers the column-level items over the table-level items', async () => {
      const withColumnItems: MRT_ColumnDef<Person>[] = columns.map((column) =>
        column.accessorKey === 'age'
          ? {
              ...column,
              renderColumnActionsMenuItems: () => (
                <Menu.Item>Only for age</Menu.Item>
              ),
            }
          : column,
      );
      const { user } = renderWithMantine(
        <StateTable
          columns={withColumnItems}
          renderColumnActionsMenuItems={() => <Menu.Item>For any</Menu.Item>}
        />,
      );
      await openMenu(user, 'Age');
      expect(menuItem('Only for age')).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'For any' })).toBeNull();
      expect(
        screen.queryByRole('menuitem', { name: 'Hide Age column' }),
      ).toBeNull();
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

      await openMenu(user, 'City');
      expect(menuItem('For any')).toBeInTheDocument();
    });
  });
});

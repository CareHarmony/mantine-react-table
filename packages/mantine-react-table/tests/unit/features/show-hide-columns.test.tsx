import { columns, people, type Person } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { type UserEvent } from '@testing-library/user-event';
import {
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_TableOptions,
  useMantineReactTable,
} from 'mantine-react-table-ng';
import { describe, expect, it, vi } from 'vitest';

const getRowId = (row: Person) => row.id;

const groupedColumns: MRT_ColumnDef<Person>[] = [
  {
    columns: [
      { accessorKey: 'firstName', header: 'First Name' },
      { accessorKey: 'lastName', header: 'Last Name' },
    ],
    header: 'Name',
    id: 'name',
  },
  { accessorKey: 'age', header: 'Age' },
  { accessorKey: 'city', header: 'City' },
];

//prints the table state next to the table, like a consumer that reads `table.getState()`
const StateTable = (options: Partial<MRT_TableOptions<Person>>) => {
  const table = useMantineReactTable({
    columns,
    data: people,
    getRowId,
    ...options,
  });
  const { columnOrder, columnPinning, columnVisibility } = table.getState();
  return (
    <>
      <output data-testid="state">
        {JSON.stringify({ columnOrder, columnPinning, columnVisibility })}
      </output>
      <MantineReactTable table={table} />
    </>
  );
};

const state = () => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

const headerText = () =>
  screen
    .queryAllByRole('columnheader')
    .map((header) => header.textContent?.trim())
    .filter(Boolean);

const headerCell = (name: string) => {
  const cell = screen
    .getAllByRole('columnheader')
    .find((header) => header.textContent?.trim() === name);
  if (!cell) throw new Error(`no "${name}" header`);
  return cell;
};

const openMenu = async (user: UserEvent) => {
  await user.click(screen.getByRole('button', { name: 'Show/Hide columns' }));
  return screen.findByRole('menu');
};

const menu = () => screen.getByRole('menu');

const menuButton = (name: string) =>
  within(menu()).getByRole('button', { name });

const columnSwitch = (name: string) =>
  within(menu()).getByRole('switch', { name });

const menuRows = () => within(menu()).getAllByRole('menuitem');

const menuRowText = () => menuRows().map((row) => row.textContent?.trim());

const menuRow = (name: string) => {
  const row = menuRows().find((item) => item.textContent?.trim() === name);
  if (!row) throw new Error(`no "${name}" row in the show/hide menu`);
  return row;
};

//the pin buttons have a tooltip and no accessible name: [left, right] or [unpin]
const pinButtons = (name: string) => {
  const group = menuRow(name).querySelector('.mrt-column-pinning-buttons');
  if (!group) throw new Error(`no pin buttons in the "${name}" row`);
  return within(group as HTMLElement).getAllByRole('button');
};

describe(`show/hide columns menu [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  describe('visibility', () => {
    it('lists one checked switch per column', async () => {
      const { user } = renderWithMantine(<StateTable />);
      await openMenu(user);
      expect(menuRowText()).toEqual(['First Name', 'Last Name', 'Age', 'City']);
      expect(within(menu()).getAllByRole('switch')).toHaveLength(4);
      within(menu())
        .getAllByRole('switch')
        .forEach((columnToggle) => expect(columnToggle).toBeChecked());
      expect(menuButton('Hide all')).toBeEnabled();
      expect(menuButton('Show all')).toBeDisabled();
    });

    it('hides one column and shows it again', async () => {
      const { user } = renderWithMantine(<StateTable />);
      await openMenu(user);
      await user.click(columnSwitch('Age'));

      await waitFor(() =>
        expect(headerText()).toEqual(['First Name', 'Last Name', 'City']),
      );
      expect(state().columnVisibility).toEqual({ age: false });
      expect(columnSwitch('Age')).not.toBeChecked();
      expect(columnSwitch('City')).toBeChecked();
      expect(menuButton('Show all')).toBeEnabled();

      await user.click(columnSwitch('Age'));
      await waitFor(() =>
        expect(headerText()).toEqual([
          'First Name',
          'Last Name',
          'Age',
          'City',
        ]),
      );
      expect(state().columnVisibility).toEqual({ age: true });
      expect(columnSwitch('Age')).toBeChecked();
    });

    it('hides all columns, then shows all columns', async () => {
      const { user } = renderWithMantine(<StateTable />);
      await openMenu(user);
      await user.click(menuButton('Hide all'));

      await waitFor(() => expect(headerText()).toEqual([]));
      expect(state().columnVisibility).toEqual({
        age: false,
        city: false,
        firstName: false,
        lastName: false,
      });
      within(menu())
        .getAllByRole('switch')
        .forEach((columnToggle) => expect(columnToggle).not.toBeChecked());
      expect(menuButton('Hide all')).toBeDisabled();

      await user.click(menuButton('Show all'));
      await waitFor(() =>
        expect(headerText()).toEqual([
          'First Name',
          'Last Name',
          'Age',
          'City',
        ]),
      );
      expect(state().columnVisibility).toEqual({
        age: true,
        city: true,
        firstName: true,
        lastName: true,
      });
      expect(menuButton('Show all')).toBeDisabled();
    });

    it('keeps a column that cannot be hidden when hiding all', async () => {
      const withFixedColumn: MRT_ColumnDef<Person>[] = columns.map((column) =>
        column.accessorKey === 'firstName'
          ? { ...column, enableHiding: false }
          : column,
      );
      const { user } = renderWithMantine(
        <StateTable columns={withFixedColumn} />,
      );
      await openMenu(user);
      expect(columnSwitch('First Name')).toBeDisabled();
      await user.click(menuButton('Hide all'));

      await waitFor(() => expect(headerText()).toEqual(['First Name']));
      expect(state().columnVisibility).toEqual({
        age: false,
        city: false,
        lastName: false,
      });
      expect(columnSwitch('First Name')).toBeChecked();
    });

    it('leaves out a column with visibleInShowHideMenu off', async () => {
      const withUnlistedColumn: MRT_ColumnDef<Person>[] = columns.map(
        (column) =>
          column.accessorKey === 'age'
            ? { ...column, visibleInShowHideMenu: false }
            : column,
      );
      const { user } = renderWithMantine(
        <StateTable columns={withUnlistedColumn} />,
      );
      await openMenu(user);
      expect(menuRowText()).toEqual(['First Name', 'Last Name', 'City']);
    });

    it('lists plain header text when hiding is off', async () => {
      const { user } = renderWithMantine(
        <StateTable enableColumnPinning enableHiding={false} />,
      );
      await openMenu(user);
      expect(within(menu()).queryAllByRole('switch')).toHaveLength(0);
      expect(menuRowText()).toEqual(['First Name', 'Last Name', 'Age', 'City']);
      expect(
        within(menu()).queryByRole('button', { name: 'Hide all' }),
      ).toBeNull();
      expect(
        within(menu()).queryByRole('button', { name: 'Show all' }),
      ).toBeNull();
      expect(menuButton('Unpin all')).toBeDisabled();
    });
  });

  describe('group columns', () => {
    it('hides and shows the children of a group column', async () => {
      const { user } = renderWithMantine(
        <StateTable columns={groupedColumns} />,
      );
      await openMenu(user);
      expect(menuRowText()).toEqual([
        'Name',
        'First Name',
        'Last Name',
        'Age',
        'City',
      ]);
      expect(columnSwitch('Name')).toBeChecked();

      await user.click(columnSwitch('Name'));
      await waitFor(() =>
        expect(state().columnVisibility).toEqual({
          firstName: false,
          lastName: false,
        }),
      );
      expect(headerText()).toEqual(['Age', 'City']);
      expect(columnSwitch('Name')).not.toBeChecked();
      expect(columnSwitch('First Name')).not.toBeChecked();
      expect(columnSwitch('Last Name')).not.toBeChecked();

      await user.click(columnSwitch('Name'));
      await waitFor(() =>
        expect(state().columnVisibility).toEqual({
          firstName: true,
          lastName: true,
        }),
      );
      expect(headerText()).toEqual([
        'Name',
        'First Name',
        'Last Name',
        'Age',
        'City',
      ]);
    });

    it('keeps the group switch checked while one child is visible', async () => {
      const { user } = renderWithMantine(
        <StateTable columns={groupedColumns} />,
      );
      await openMenu(user);
      await user.click(columnSwitch('First Name'));

      await waitFor(() =>
        expect(state().columnVisibility).toEqual({ firstName: false }),
      );
      expect(headerText()).toEqual(['Name', 'Last Name', 'Age', 'City']);
      expect(columnSwitch('Name')).toBeChecked();

      //the group switch then hides the remaining child
      await user.click(columnSwitch('Name'));
      await waitFor(() => expect(headerText()).toEqual(['Age', 'City']));
      expect(state().columnVisibility).toEqual({
        firstName: false,
        lastName: false,
      });
    });
  });

  describe('column order', () => {
    it('resets a custom column order', async () => {
      const { user } = renderWithMantine(
        <StateTable
          enableColumnOrdering
          initialState={{
            columnOrder: ['city', 'age', 'lastName', 'firstName'],
          }}
        />,
      );
      expect(headerText()).toEqual(['City', 'Age', 'Last Name', 'First Name']);
      await openMenu(user);
      expect(menuRowText()).toEqual(['City', 'Age', 'Last Name', 'First Name']);

      await user.click(menuButton('Reset order'));
      await waitFor(() =>
        expect(headerText()).toEqual([
          'First Name',
          'Last Name',
          'Age',
          'City',
        ]),
      );
      expect(
        state().columnOrder.filter((id: string) => !id.startsWith('mrt-')),
      ).toEqual(['firstName', 'lastName', 'age', 'city']);
      expect(menuRowText()).toEqual(['First Name', 'Last Name', 'Age', 'City']);
    });

    it('moves a column by dragging its grab handle onto another row', async () => {
      const { user } = renderWithMantine(<StateTable enableColumnOrdering />);
      await openMenu(user);
      const handle = within(menuRow('City')).getByRole('button', {
        name: 'Move',
      });
      const dataTransfer = { setDragImage: vi.fn() };

      fireEvent.dragStart(handle, { dataTransfer });
      expect(dataTransfer.setDragImage).toHaveBeenCalledWith(
        menuRow('City'),
        0,
        0,
      );
      await waitFor(() =>
        expect(menuRow('City')).toHaveAttribute('data-dragging'),
      );

      fireEvent.dragEnter(menuRow('First Name'));
      await waitFor(() =>
        expect(menuRow('First Name')).toHaveAttribute('data-order-hovered'),
      );
      expect(menuRow('Age')).not.toHaveAttribute('data-order-hovered');

      fireEvent.dragEnd(
        within(menuRow('City')).getByRole('button', { name: 'Move' }),
        { dataTransfer },
      );
      await waitFor(() =>
        expect(headerText()).toEqual([
          'City',
          'First Name',
          'Last Name',
          'Age',
        ]),
      );
      expect(
        state().columnOrder.filter((id: string) => !id.startsWith('mrt-')),
      ).toEqual(['city', 'firstName', 'lastName', 'age']);
      expect(menuRowText()).toEqual(['City', 'First Name', 'Last Name', 'Age']);
      expect(menuRow('City')).not.toHaveAttribute('data-dragging');
      expect(menuRow('First Name')).not.toHaveAttribute('data-order-hovered');
    });

    it('gives no grab handle or drop target to a column with ordering off', async () => {
      const withFixedOrder: MRT_ColumnDef<Person>[] = columns.map((column) =>
        column.accessorKey === 'firstName'
          ? { ...column, enableColumnOrdering: false }
          : column,
      );
      const { user } = renderWithMantine(
        <StateTable columns={withFixedOrder} enableColumnOrdering />,
      );
      await openMenu(user);
      expect(
        within(menuRow('First Name')).queryByRole('button', { name: 'Move' }),
      ).toBeNull();
      expect(
        within(menu()).getAllByRole('button', { name: 'Move' }),
      ).toHaveLength(3);

      fireEvent.dragEnter(menuRow('First Name'));
      fireEvent.dragEnter(menuRow('Age'));
      await waitFor(() =>
        expect(menuRow('Age')).toHaveAttribute('data-order-hovered'),
      );
      expect(menuRow('First Name')).not.toHaveAttribute('data-order-hovered');
    });

    it('has no reset button when column ordering is off', async () => {
      const { user } = renderWithMantine(<StateTable />);
      await openMenu(user);
      expect(
        within(menu()).queryByRole('button', { name: 'Reset order' }),
      ).toBeNull();
    });
  });

  describe('column pinning', () => {
    it('pins left, pins right and unpins from the row buttons', async () => {
      const { user } = renderWithMantine(<StateTable enableColumnPinning />);
      await openMenu(user);
      expect(menuButton('Unpin all')).toBeDisabled();
      expect(pinButtons('Age')).toHaveLength(2);

      await user.click(pinButtons('Age')[0]);
      await waitFor(() =>
        expect(headerCell('Age')).toHaveAttribute('data-column-pinned', 'left'),
      );
      expect(state().columnPinning.left).toContain('age');
      expect(headerText()).toEqual(['Age', 'First Name', 'Last Name', 'City']);
      //left pinned columns move to the top of the list
      expect(menuRowText()).toEqual(['Age', 'First Name', 'Last Name', 'City']);
      expect(pinButtons('Age')).toHaveLength(1);
      expect(menuButton('Unpin all')).toBeEnabled();

      await user.click(pinButtons('City')[1]);
      await waitFor(() =>
        expect(headerCell('City')).toHaveAttribute(
          'data-column-pinned',
          'right',
        ),
      );
      expect(state().columnPinning.right).toEqual(['city']);

      await user.click(pinButtons('Age')[0]);
      await waitFor(() =>
        expect(headerCell('Age')).not.toHaveAttribute('data-column-pinned'),
      );
      expect(state().columnPinning.left).not.toContain('age');
      expect(pinButtons('Age')).toHaveLength(2);
      expect(headerCell('City')).toHaveAttribute('data-column-pinned', 'right');
    });

    it('unpins all columns', async () => {
      const { user } = renderWithMantine(
        <StateTable
          enableColumnPinning
          initialState={{ columnPinning: { left: ['age'], right: ['city'] } }}
        />,
      );
      expect(headerText()).toEqual(['Age', 'First Name', 'Last Name', 'City']);
      expect(headerCell('Age')).toHaveAttribute('data-column-pinned', 'left');
      expect(headerCell('City')).toHaveAttribute('data-column-pinned', 'right');

      await openMenu(user);
      await user.click(menuButton('Unpin all'));

      await waitFor(() =>
        expect(document.querySelector('th[data-column-pinned]')).toBeNull(),
      );
      expect(state().columnPinning).toEqual({ left: [], right: [] });
      expect(headerText()).toEqual(['First Name', 'Last Name', 'Age', 'City']);
      expect(menuButton('Unpin all')).toBeDisabled();
    });

    it('has no pin buttons for a column that cannot be pinned', async () => {
      const withUnpinnable: MRT_ColumnDef<Person>[] = columns.map((column) =>
        column.accessorKey === 'age'
          ? { ...column, enablePinning: false }
          : column,
      );
      const { user } = renderWithMantine(
        <StateTable columns={withUnpinnable} enableColumnPinning />,
      );
      await openMenu(user);
      expect(
        menuRow('Age').querySelector('.mrt-column-pinning-buttons'),
      ).toBeNull();
      expect(pinButtons('City')).toHaveLength(2);
    });
  });
});

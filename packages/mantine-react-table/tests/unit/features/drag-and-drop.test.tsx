import { useState } from 'react';

import { columns, people, type Person } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_TableOptions,
  type MRT_TableState,
} from 'mantine-react-table-ng';
import { describe, expect, it, vi } from 'vitest';

type Options = Partial<MRT_TableOptions<Person>>;
type State = MRT_TableState<Person>;

const dataColumnIds = ['firstName', 'lastName', 'age', 'city'];

//prints the controlled drag state next to the table
const DragTable = ({
  initialColumnOrder = dataColumnIds,
  ...props
}: { initialColumnOrder?: string[] } & Options) => {
  const [columnOrder, setColumnOrder] = useState(initialColumnOrder);
  const [grouping, setGrouping] = useState<string[]>([]);
  const [draggingColumn, setDraggingColumn] =
    useState<State['draggingColumn']>(null);
  const [hoveredColumn, setHoveredColumn] =
    useState<State['hoveredColumn']>(null);
  const [draggingRow, setDraggingRow] = useState<State['draggingRow']>(null);
  const [hoveredRow, setHoveredRow] = useState<State['hoveredRow']>(null);
  return (
    <>
      <output data-testid="order">{columnOrder.join(',')}</output>
      <output data-testid="grouping">{grouping.join(',')}</output>
      <output data-testid="dragging-column">{draggingColumn?.id}</output>
      <output data-testid="hovered-column">{hoveredColumn?.id}</output>
      <output data-testid="dragging-row">{draggingRow?.id}</output>
      <output data-testid="hovered-row">{hoveredRow?.id}</output>
      <MantineReactTable
        columns={columns}
        data={people}
        getRowId={(row) => row.id}
        onColumnOrderChange={setColumnOrder}
        onDraggingColumnChange={setDraggingColumn}
        onDraggingRowChange={setDraggingRow}
        onGroupingChange={setGrouping}
        onHoveredColumnChange={setHoveredColumn}
        onHoveredRowChange={setHoveredRow}
        {...props}
        state={{
          columnOrder,
          draggingColumn,
          draggingRow,
          grouping,
          hoveredColumn,
          hoveredRow,
        }}
      />
    </>
  );
};

const probe = (id: string) => screen.getByTestId(id).textContent;

const headCell = (header: string) =>
  within(screen.getAllByRole('rowgroup')[0])
    .getByText(header)
    .closest('th') as HTMLElement;

const headHandle = (header: string) =>
  within(headCell(header)).getByRole('button', { name: 'Move' });

const bodyRow = (text: string) =>
  screen.getByText(text).closest('tr') as HTMLElement;

const rowHandle = (text: string) =>
  within(bodyRow(text)).getByRole('button', { name: 'Move' });

const dragStart = (element: HTMLElement) => {
  const dataTransfer = { setDragImage: vi.fn() };
  fireEvent.dragStart(element, { dataTransfer });
  return dataTransfer;
};

describe(`drag and drop [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  describe('column ordering from the table head', () => {
    it('moves a column in front of the head cell it is dropped on', () => {
      const onDragStart = vi.fn();
      const onDragEnd = vi.fn();
      renderWithMantine(
        <DragTable
          enableColumnOrdering
          mantineColumnDragHandleProps={{ onDragEnd, onDragStart }}
        />,
      );
      const dataTransfer = dragStart(headHandle('First Name'));
      expect(onDragStart).toHaveBeenCalledTimes(1);
      expect(dataTransfer.setDragImage).toHaveBeenCalledWith(
        headCell('First Name'),
        0,
        0,
      );
      expect(probe('dragging-column')).toBe('firstName');
      expect(headCell('First Name')).toHaveAttribute('data-dragging-column');

      fireEvent.dragEnter(headCell('Age'));
      expect(probe('hovered-column')).toBe('age');
      expect(headCell('Age')).toHaveAttribute('data-hovered-column-target');

      fireEvent.dragEnd(headHandle('First Name'));
      expect(onDragEnd).toHaveBeenCalledTimes(1);
      expect(probe('order')).toBe('lastName,age,firstName,city');
      expect(probe('dragging-column')).toBe('');
      expect(probe('hovered-column')).toBe('');
      expect(
        screen
          .getAllByRole('columnheader')
          .map((cell) => cell.textContent?.trim()),
      ).toEqual(['Last Name', 'Age', 'First Name', 'City']);
    });

    it('moves a column in front of the body cell it is dropped on', () => {
      const onDragEnter = vi.fn();
      renderWithMantine(
        <DragTable
          enableColumnOrdering
          mantineTableBodyCellProps={{ onDragEnter }}
        />,
      );
      dragStart(headHandle('City'));
      const target = screen.getByText('Xu').closest('td') as HTMLElement;
      fireEvent.dragEnter(target);
      expect(onDragEnter).toHaveBeenCalledTimes(1);
      expect(probe('hovered-column')).toBe('lastName');
      expect(target).toHaveAttribute('data-hovered-column-target');

      fireEvent.dragEnd(headHandle('City'));
      expect(probe('order')).toBe('firstName,city,lastName,age');
    });

    it('keeps the order when the column is dropped on itself', () => {
      renderWithMantine(<DragTable enableColumnOrdering />);
      dragStart(headHandle('Age'));
      fireEvent.dragEnter(headCell('Age'));
      fireEvent.dragEnd(headHandle('Age'));
      expect(probe('order')).toBe('firstName,lastName,age,city');
      expect(probe('dragging-column')).toBe('');
    });

    it('does not accept a drop on a column with enableColumnOrdering false', () => {
      const lockedColumns: MRT_ColumnDef<Person>[] = columns.map((column) =>
        column.accessorKey === 'age'
          ? { ...column, enableColumnOrdering: false }
          : column,
      );
      renderWithMantine(
        <DragTable columns={lockedColumns} enableColumnOrdering />,
      );
      expect(
        within(headCell('Age')).queryByRole('button', { name: 'Move' }),
      ).toBeNull();

      dragStart(headHandle('First Name'));
      fireEvent.dragEnter(headCell('City'));
      expect(probe('hovered-column')).toBe('city');
      fireEvent.dragEnter(headCell('Age'));
      expect(probe('hovered-column')).toBe('');
      fireEvent.dragEnter(headCell('City'));
      fireEvent.dragEnter(screen.getByText('31').closest('td') as HTMLElement);
      expect(probe('hovered-column')).toBe('');

      fireEvent.dragEnd(headHandle('First Name'));
      expect(probe('order')).toBe('firstName,lastName,age,city');
    });

    it('ignores drag enter on the table when no column is dragged', () => {
      renderWithMantine(<DragTable enableColumnOrdering />);
      fireEvent.dragEnter(headCell('Age'));
      fireEvent.dragEnter(screen.getByText('Xu').closest('td') as HTMLElement);
      expect(probe('hovered-column')).toBe('');
    });
  });

  describe('grouping by dropping a column on the toolbar drop zone', () => {
    const GroupingTable = (props: Options) => (
      <DragTable enableColumnDragging enableGrouping {...props} />
    );

    //the drop zone mounts in an effect after the drag starts
    const dropZone = (header: string) =>
      screen.findByText(`Drop to group by ${header}`);

    it('shows the drop zone only while a column is dragged', async () => {
      renderWithMantine(<GroupingTable />);
      expect(screen.queryByText(/Drop to group by/)).toBeNull();
      dragStart(headHandle('City'));
      expect(await dropZone('City')).toBeInTheDocument();

      fireEvent.dragEnd(headHandle('City'));
      await waitFor(() =>
        expect(screen.queryByText(/Drop to group by/)).toBeNull(),
      );
      expect(probe('grouping')).toBe('');
    });

    it('groups by the dragged column', async () => {
      renderWithMantine(<GroupingTable />);
      dragStart(headHandle('City'));
      fireEvent.dragEnter(await dropZone('City'));
      expect(probe('hovered-column')).toBe('drop-zone');

      fireEvent.dragEnd(headHandle('City'));
      expect(probe('grouping')).toBe('city');
      expect(probe('hovered-column')).toBe('');
      expect(probe('dragging-column')).toBe('');
    });

    it('does not group when the drag leaves the drop zone for a head cell', async () => {
      renderWithMantine(<GroupingTable />);
      dragStart(headHandle('City'));
      fireEvent.dragEnter(await dropZone('City'));
      fireEvent.dragEnter(headCell('Age'));
      expect(probe('hovered-column')).toBe('');

      fireEvent.dragEnd(headHandle('City'));
      expect(probe('grouping')).toBe('');
    });

    it('does not group when the drag leaves the drop zone for a body cell', async () => {
      renderWithMantine(<GroupingTable />);
      dragStart(headHandle('Last Name'));
      fireEvent.dragEnter(await dropZone('Last Name'));
      fireEvent.dragEnter(screen.getByText('Xu').closest('td') as HTMLElement);
      expect(probe('hovered-column')).toBe('');

      fireEvent.dragEnd(headHandle('Last Name'));
      expect(probe('grouping')).toBe('');
    });
  });

  describe('row ordering', () => {
    const rowOrder = ['mrt-row-drag', ...dataColumnIds];

    it('tracks the dragging row and the hovered row and clears both on drag end', () => {
      const onDragStart = vi.fn();
      const onDragEnd = vi.fn();
      renderWithMantine(
        <DragTable
          enableRowOrdering
          enableSorting={false}
          initialColumnOrder={rowOrder}
          mantineRowDragHandleProps={({ row, table }) => ({
            onDragEnd: () =>
              onDragEnd(
                row.id,
                table.getState().draggingRow?.id,
                table.getState().hoveredRow?.id,
              ),
            onDragStart,
          })}
        />,
      );
      const dataTransfer = dragStart(rowHandle('Ada'));
      expect(onDragStart).toHaveBeenCalledTimes(1);
      expect(dataTransfer.setDragImage).toHaveBeenCalledWith(
        bodyRow('Ada'),
        0,
        0,
      );
      expect(probe('dragging-row')).toBe('p1');
      expect(bodyRow('Ada')).toHaveAttribute('data-dragging-row');

      fireEvent.dragEnter(bodyRow('Dee'));
      expect(probe('hovered-row')).toBe('p4');
      expect(bodyRow('Dee')).toHaveAttribute('data-hovered-row-target');

      fireEvent.dragEnd(rowHandle('Ada'));
      expect(onDragEnd).toHaveBeenCalledTimes(1);
      expect(onDragEnd).toHaveBeenCalledWith('p1', 'p1', 'p4');
      expect(probe('dragging-row')).toBe('');
      expect(probe('hovered-row')).toBe('');
      expect(bodyRow('Ada')).not.toHaveAttribute('data-dragging-row');
      expect(bodyRow('Dee')).not.toHaveAttribute('data-hovered-row-target');
    });

    it('does not hover a row when no row is dragged', () => {
      renderWithMantine(
        <DragTable enableRowOrdering initialColumnOrder={rowOrder} />,
      );
      fireEvent.dragEnter(bodyRow('Dee'));
      expect(probe('hovered-row')).toBe('');
    });

    it('lets the consumer reorder the data in onDragEnd', () => {
      const ReorderTable = () => {
        const [data, setData] = useState(people);
        return (
          <MantineReactTable
            columns={columns}
            data={data}
            enableRowOrdering
            enableSorting={false}
            getRowId={(row) => row.id}
            mantineRowDragHandleProps={({ table }) => ({
              onDragEnd: () => {
                const { draggingRow, hoveredRow } = table.getState();
                if (!draggingRow || !hoveredRow) return;
                const next = [...data];
                next.splice(
                  hoveredRow.index as number,
                  0,
                  next.splice(draggingRow.index, 1)[0],
                );
                setData(next);
              },
            })}
          />
        );
      };
      renderWithMantine(<ReorderTable />);
      dragStart(rowHandle('Eli'));
      fireEvent.dragEnter(bodyRow('Ben'));
      fireEvent.dragEnd(rowHandle('Eli'));

      const names = screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => row.querySelectorAll('td')[1]?.textContent);
      expect(names).toEqual(['Ada', 'Eli', 'Ben', 'Cy', 'Dee']);
    });
  });

  describe('column ordering from the show/hide columns menu', () => {
    const openMenu = async (
      user: ReturnType<typeof renderWithMantine>['user'],
    ) => {
      await user.click(
        screen.getByRole('button', { name: 'Show/Hide columns' }),
      );
      return screen.findByRole('menu');
    };

    const menuItem = (menu: HTMLElement, header: string) =>
      within(menu)
        .getByText(header)
        .closest('[role="menuitem"]') as HTMLElement;

    const menuHandle = (menu: HTMLElement, header: string) =>
      within(menuItem(menu, header)).getByRole('button', { name: 'Move' });

    it('moves a column in front of the menu item it is dropped on', async () => {
      const { user } = renderWithMantine(<DragTable enableColumnOrdering />);
      const menu = await openMenu(user);

      const dataTransfer = dragStart(menuHandle(menu, 'City'));
      expect(dataTransfer.setDragImage).toHaveBeenCalledWith(
        menuItem(menu, 'City'),
        0,
        0,
      );
      expect(menuItem(menu, 'City')).toHaveAttribute('data-dragging');

      fireEvent.dragEnter(menuItem(menu, 'First Name'));
      expect(menuItem(menu, 'First Name')).toHaveAttribute(
        'data-order-hovered',
      );

      fireEvent.dragEnd(menuHandle(menu, 'City'));
      expect(probe('order')).toBe('city,firstName,lastName,age');
      expect(menuItem(menu, 'City')).not.toHaveAttribute('data-dragging');
      expect(menuItem(menu, 'First Name')).not.toHaveAttribute(
        'data-order-hovered',
      );
    });

    it('does not hover the menu item that is being dragged', async () => {
      const { user } = renderWithMantine(<DragTable enableColumnOrdering />);
      const menu = await openMenu(user);
      dragStart(menuHandle(menu, 'Age'));
      fireEvent.dragEnter(menuItem(menu, 'Age'));
      expect(menuItem(menu, 'Age')).not.toHaveAttribute('data-order-hovered');

      fireEvent.dragEnd(menuHandle(menu, 'Age'));
      expect(probe('order')).toBe('firstName,lastName,age,city');
    });

    it('does not accept a drop on a column with enableColumnOrdering false', async () => {
      const lockedColumns: MRT_ColumnDef<Person>[] = columns.map((column) =>
        column.accessorKey === 'lastName'
          ? { ...column, enableColumnOrdering: false }
          : column,
      );
      const { user } = renderWithMantine(
        <DragTable columns={lockedColumns} enableColumnOrdering />,
      );
      const menu = await openMenu(user);
      expect(
        within(menuItem(menu, 'Last Name')).queryByRole('button', {
          name: 'Move',
        }),
      ).toBeNull();

      dragStart(menuHandle(menu, 'City'));
      fireEvent.dragEnter(menuItem(menu, 'Last Name'));
      expect(menuItem(menu, 'Last Name')).not.toHaveAttribute(
        'data-order-hovered',
      );
      fireEvent.dragEnd(menuHandle(menu, 'City'));
      expect(probe('order')).toBe('firstName,lastName,age,city');
    });
  });
});

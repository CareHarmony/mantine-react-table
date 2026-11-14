import { useState } from 'react';

import { columns, manyPeople, people, type Person } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import { screen, within } from '@testing-library/react';
import {
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  type MRT_TableOptions,
  type MRT_TableState,
} from 'mantine-react-table-ng';
import { describe, expect, it } from 'vitest';

type User = ReturnType<typeof renderWithMantine>['user'];

//prints the controlled rowSelection and rowPinning state next to the table
const SelectionTable = <TData extends { id: string }>(
  props: Partial<MRT_TableOptions<TData>> &
    Pick<MRT_TableOptions<TData>, 'columns' | 'data'>,
) => {
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
  const [rowPinning, setRowPinning] = useState<
    MRT_TableState<TData>['rowPinning']
  >({
    bottom: [],
    top: [],
  });
  return (
    <>
      <output data-testid="selection">
        {Object.keys(rowSelection)
          .filter((id) => rowSelection[id])
          .sort()
          .join(',')}
      </output>
      <output data-testid="pinned-top">{rowPinning.top?.join(',')}</output>
      <output data-testid="pinned-bottom">
        {rowPinning.bottom?.join(',')}
      </output>
      <MantineReactTable
        enableRowSelection
        getRowId={(row) => row.id}
        onRowPinningChange={setRowPinning}
        onRowSelectionChange={setRowSelection}
        {...props}
        state={{ rowPinning, rowSelection }}
      />
    </>
  );
};

const probe = (id: string) => screen.getByTestId(id).textContent ?? '';
const selection = () => probe('selection');
const pinnedTop = () => probe('pinned-top');
const pinnedBottom = () => probe('pinned-bottom');

const rowCheckbox = (text: string) =>
  within(screen.getByText(text).closest('tr') as HTMLElement).getByRole(
    'checkbox',
    { name: 'Toggle select row' },
  );

const selectAllCheckbox = () =>
  screen.getByRole('checkbox', { name: 'Toggle select all' });

const shiftClick = async (user: User, element: HTMLElement) => {
  await user.keyboard('{Shift>}');
  await user.click(element);
  await user.keyboard('{/Shift}');
};

describe(`row selection [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  describe('shift-click range selection', () => {
    it('selects every row between the last clicked row and the shift-clicked row', async () => {
      const { user } = renderWithMantine(
        <SelectionTable columns={columns} data={people} />,
      );
      await user.click(rowCheckbox('Ben'));
      expect(selection()).toBe('p2');
      await shiftClick(user, rowCheckbox('Eli'));

      expect(selection()).toBe('p2,p3,p4,p5');
      expect(rowCheckbox('Ada')).not.toBeChecked();
      expect(rowCheckbox('Cy')).toBeChecked();
      expect(rowCheckbox('Dee')).toBeChecked();
    });

    it('selects a range upwards', async () => {
      const { user } = renderWithMantine(
        <SelectionTable columns={columns} data={people} />,
      );
      await user.click(rowCheckbox('Dee'));
      await shiftClick(user, rowCheckbox('Ada'));
      expect(selection()).toBe('p1,p2,p3,p4');
    });

    it('deselects a range when the last clicked row was deselected', async () => {
      const { user } = renderWithMantine(
        <SelectionTable columns={columns} data={people} />,
      );
      await user.click(rowCheckbox('Ada'));
      await shiftClick(user, rowCheckbox('Eli'));
      expect(selection()).toBe('p1,p2,p3,p4,p5');

      await user.click(rowCheckbox('Ben'));
      await shiftClick(user, rowCheckbox('Dee'));
      expect(selection()).toBe('p1,p5');
    });

    it('changes only the clicked row when both rows already have the same state', async () => {
      const { user } = renderWithMantine(
        <SelectionTable columns={columns} data={people} />,
      );
      await user.click(rowCheckbox('Ada'));
      await user.click(rowCheckbox('Dee'));
      //Dee is selected and Ada is selected, so the rows between them stay as they are
      await shiftClick(user, rowCheckbox('Ada'));
      expect(selection()).toBe('p4');
    });

    it('offsets the range by the page index on a later page', async () => {
      const { user } = renderWithMantine(
        <SelectionTable
          columns={columns}
          data={manyPeople(12)}
          initialState={{ pagination: { pageIndex: 1, pageSize: 5 } }}
        />,
      );
      await user.click(rowCheckbox('First5'));
      await shiftClick(user, rowCheckbox('First8'));
      expect(selection()).toBe('m5,m6,m7,m8');
    });

    it('selects only the two clicked rows with enableBatchRowSelection false', async () => {
      const { user } = renderWithMantine(
        <SelectionTable
          columns={columns}
          data={people}
          enableBatchRowSelection={false}
        />,
      );
      await user.click(rowCheckbox('Ben'));
      await shiftClick(user, rowCheckbox('Eli'));
      expect(selection()).toBe('p2,p5');
    });

    it('starts a new range after select all resets the last clicked row', async () => {
      const { user } = renderWithMantine(
        <SelectionTable columns={columns} data={people} />,
      );
      await user.click(rowCheckbox('Ben'));
      await user.click(selectAllCheckbox());
      expect(selection()).toBe('p1,p2,p3,p4,p5');
      await user.click(selectAllCheckbox());
      expect(selection()).toBe('');

      await shiftClick(user, rowCheckbox('Eli'));
      expect(selection()).toBe('p5');
    });
  });

  describe('sub rows', () => {
    type Node = { subRows?: Node[] } & Person;

    const tree: Node[] = [
      {
        ...people[0],
        subRows: [
          { ...people[1], id: 'c1' },
          { ...people[2], id: 'c2' },
        ],
      },
      people[3],
    ];

    const treeColumns = columns as unknown as MRT_ColumnDef<Node>[];

    const TreeTable = () => (
      <SelectionTable
        columns={treeColumns}
        data={tree}
        enableExpanding
        initialState={{ expanded: true }}
      />
    );

    it('selects the sub rows with their parent', async () => {
      const { user } = renderWithMantine(<TreeTable />);
      await user.click(rowCheckbox('Ada'));
      expect(selection()).toBe('c1,c2,p1');
      expect(rowCheckbox('Ben')).toBeChecked();
      expect(rowCheckbox('Dee')).not.toBeChecked();
    });

    it('shows the parent as checked when every sub row is selected', async () => {
      const { user } = renderWithMantine(<TreeTable />);
      await user.click(rowCheckbox('Ben'));
      expect(rowCheckbox('Ada')).not.toBeChecked();
      await user.click(rowCheckbox('Cy'));
      expect(selection()).toBe('c1,c2');
      expect(rowCheckbox('Ada')).toBeChecked();
    });

    it('deselects every sub row when the parent of fully selected sub rows is clicked', async () => {
      const { user } = renderWithMantine(<TreeTable />);
      await user.click(rowCheckbox('Ben'));
      await user.click(rowCheckbox('Cy'));
      await user.click(rowCheckbox('Ada'));

      expect(selection()).toBe('');
      expect(rowCheckbox('Ada')).not.toBeChecked();
      expect(rowCheckbox('Ben')).not.toBeChecked();
      expect(rowCheckbox('Cy')).not.toBeChecked();
    });

    it('deselects the parent and its sub rows on a second parent click', async () => {
      const { user } = renderWithMantine(<TreeTable />);
      await user.click(rowCheckbox('Dee'));
      await user.click(rowCheckbox('Ada'));
      await user.click(rowCheckbox('Ada'));
      expect(selection()).toBe('p4');
    });
  });

  describe('select all', () => {
    it('selects the current page by default', async () => {
      const { user } = renderWithMantine(
        <SelectionTable
          columns={columns}
          data={manyPeople(12)}
          initialState={{ pagination: { pageIndex: 0, pageSize: 5 } }}
        />,
      );
      await user.click(selectAllCheckbox());
      expect(selection()).toBe('m0,m1,m2,m3,m4');
      await user.click(selectAllCheckbox());
      expect(selection()).toBe('');
    });

    it('selects every row with selectAllMode all', async () => {
      const { user } = renderWithMantine(
        <SelectionTable
          columns={columns}
          data={manyPeople(12)}
          initialState={{ pagination: { pageIndex: 0, pageSize: 5 } }}
          selectAllMode="all"
        />,
      );
      await user.click(selectAllCheckbox());
      expect(selection().split(',')).toHaveLength(12);
    });
  });

  describe('row pinning by selection', () => {
    it('pins a selected row to the top and unpins it when deselected', async () => {
      const { user } = renderWithMantine(
        <SelectionTable
          columns={columns}
          data={people}
          enableRowPinning
          rowPinningDisplayMode="select-top"
        />,
      );
      await user.click(rowCheckbox('Cy'));
      expect(selection()).toBe('p3');
      expect(pinnedTop()).toBe('p3');
      expect(pinnedBottom()).toBe('');

      await user.click(rowCheckbox('Cy'));
      expect(selection()).toBe('');
      expect(pinnedTop()).toBe('');
    });

    it('pins a selected row to the bottom with select-bottom', async () => {
      const { user } = renderWithMantine(
        <SelectionTable
          columns={columns}
          data={people}
          enableRowPinning
          rowPinningDisplayMode="select-bottom"
        />,
      );
      await user.click(rowCheckbox('Ben'));
      expect(pinnedBottom()).toBe('p2');
      expect(pinnedTop()).toBe('');
    });

    it('pins every row of a shift-click range', async () => {
      const { user } = renderWithMantine(
        <SelectionTable
          columns={columns}
          data={people}
          enableRowPinning
          rowPinningDisplayMode="select-sticky"
        />,
      );
      await user.click(rowCheckbox('Ada'));
      await shiftClick(user, rowCheckbox('Cy'));
      expect(selection()).toBe('p1,p2,p3');
      expect(pinnedTop().split(',').sort().join(',')).toBe('p1,p2,p3');
    });

    it('clears the pinned rows on select all', async () => {
      const { user } = renderWithMantine(
        <SelectionTable
          columns={columns}
          data={people}
          enableRowPinning
          rowPinningDisplayMode="select-top"
        />,
      );
      await user.click(rowCheckbox('Cy'));
      await user.click(rowCheckbox('Eli'));
      expect(pinnedTop().split(',').sort().join(',')).toBe('p3,p5');

      await user.click(selectAllCheckbox());
      expect(pinnedTop()).toBe('');
      expect(pinnedBottom()).toBe('');
      expect(selection()).toBe('p1,p2,p3,p4,p5');
    });
  });

  describe('pinned rows with ranked global filter results', () => {
    it('renders a pinned row once when the global filter ranks the rows', () => {
      renderWithMantine(
        <MantineReactTable
          columns={columns}
          data={people}
          enableRowPinning
          getRowId={(row) => row.id}
          initialState={{
            globalFilter: 'a',
            rowPinning: { bottom: [], top: ['p4'] },
          }}
          rowPinningDisplayMode="top"
        />,
      );
      //Dee Vance from Akron matches the filter and is pinned to the top
      expect(screen.getAllByText('Dee')).toHaveLength(1);
      const names = screen
        .getAllByRole('row')
        .map((row) => row.querySelector('td:nth-of-type(2)')?.textContent)
        .filter(Boolean);
      expect(names[0]).toBe('Dee');
      expect(names).toContain('Ada');
    });
  });
});

import { columns, people, type Person } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';
import { mockElementSizes } from './virtualization';

import {
  MantineReactTable,
  type MRT_ColumnDef,
  useMantineReactTable,
} from '@careharmony/mantine-react-table-ng';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const headerText = () =>
  Array.from(document.querySelectorAll('thead tr')).map((tr) =>
    Array.from(tr.querySelectorAll('th'))
      .map((th) => th.textContent)
      .filter(Boolean),
  );

const firstBodyRowText = () =>
  Array.from(document.querySelectorAll('tbody tr:first-child td'))
    .map((td) => td.textContent)
    .filter(Boolean);

const PinnedVirtualColumnsTable = () => {
  const table = useMantineReactTable({
    columns,
    data: people,
    enableColumnPinning: true,
    enableColumnVirtualization: true,
    initialState: { columnPinning: { left: ['firstName'], right: ['city'] } },
  });
  return (
    <>
      <button onClick={() => table.getColumn('city').toggleVisibility(false)}>
        hide city
      </button>
      <button
        onClick={() => table.getColumn('firstName').toggleVisibility(false)}
      >
        hide firstName
      </button>
      <button onClick={() => table.getColumn('age').pin('right')}>
        pin age right
      </button>
      <MantineReactTable table={table} />
    </>
  );
};

const groupedColumns: MRT_ColumnDef<Person>[] = [
  {
    columns: [
      { accessorKey: 'firstName', header: 'First Name' },
      { accessorKey: 'lastName', header: 'Last Name' },
    ],
    header: 'Name',
    id: 'name',
  },
  {
    columns: [
      { accessorKey: 'age', header: 'Age' },
      { accessorKey: 'city', header: 'City' },
    ],
    header: 'Info',
    id: 'info',
  },
];

const mixedDepthColumns: MRT_ColumnDef<Person>[] = [
  { accessorKey: 'id', header: 'Id' },
  ...groupedColumns,
];

const wideGroupedColumns: MRT_ColumnDef<Person>[] = ['A', 'B', 'C'].map(
  (group) => ({
    columns: [1, 2, 3, 4].map((n) => ({
      accessorFn: (row: Person) => `${group}${n} ${row.firstName}`,
      header: `${group}${n}`,
      id: `${group}${n}`,
    })),
    header: `Group ${group}`,
    id: `group${group}`,
  }),
);

describe('issue 228: column virtualization with pinned columns', () => {
  it('hides a right pinned column', async () => {
    mockElementSizes();
    const { user } = renderWithMantine(<PinnedVirtualColumnsTable />);
    await waitFor(() =>
      expect(firstBodyRowText()).toEqual(['Ada', 'Young', '31', 'Omaha']),
    );

    await user.click(screen.getByText('hide city'));
    await waitFor(() =>
      expect(firstBodyRowText()).toEqual(['Ada', 'Young', '31']),
    );
    expect(headerText()).toEqual([['First Name', 'Last Name', 'Age']]);
  });

  it('hides one of two right pinned columns and a left pinned column', async () => {
    mockElementSizes();
    const { user } = renderWithMantine(<PinnedVirtualColumnsTable />);
    await user.click(screen.getByText('pin age right'));
    await user.click(screen.getByText('hide city'));
    await user.click(screen.getByText('hide firstName'));
    await waitFor(() => expect(firstBodyRowText()).toEqual(['Young', '31']));
  });
});

describe('issue 89: column virtualization with header groups', () => {
  it('renders group headers above their leaf headers', async () => {
    mockElementSizes();
    renderWithMantine(
      <MantineReactTable
        columns={groupedColumns}
        data={people}
        enableColumnVirtualization
      />,
    );
    await waitFor(() =>
      expect(firstBodyRowText()).toEqual(['Ada', 'Young', '31', 'Omaha']),
    );
    expect(headerText()).toEqual([
      ['Name', 'Info'],
      ['First Name', 'Last Name', 'Age', 'City'],
    ]);
  });

  it('renders a placeholder header next to group headers', async () => {
    mockElementSizes();
    renderWithMantine(
      <MantineReactTable
        columns={mixedDepthColumns}
        data={people}
        enableColumnVirtualization
        renderTopToolbar={false}
      />,
    );
    await waitFor(() =>
      expect(firstBodyRowText()).toEqual(['p1', 'Ada', 'Young', '31', 'Omaha']),
    );
    expect(headerText()).toEqual([
      ['Name', 'Info'],
      ['Id', 'First Name', 'Last Name', 'Age', 'City'],
    ]);
  });

  it('renders only the group headers above rendered columns', async () => {
    //room for 3 columns of 180px, plus an overscan of 3 columns
    mockElementSizes({ containerWidth: 400 });
    renderWithMantine(
      <MantineReactTable
        columns={wideGroupedColumns}
        data={people}
        enableColumnVirtualization
      />,
    );
    await waitFor(() =>
      expect(firstBodyRowText()).toEqual([
        'A1 Ada',
        'A2 Ada',
        'A3 Ada',
        'A4 Ada',
        'B1 Ada',
        'B2 Ada',
      ]),
    );
    expect(headerText()).toEqual([
      ['Group A', 'Group B'],
      ['A1', 'A2', 'A3', 'A4', 'B1', 'B2'],
    ]);
    //Group B spans 4 columns and 2 of them are rendered
    const groupB = screen.getByText('Group B').closest('th') as HTMLElement;
    expect(groupB.style.width).toBe('360px');
    expect(groupB.style.minWidth).toBe('360px');
  });

  it('renders footers of grouped columns', async () => {
    mockElementSizes();
    renderWithMantine(
      <MantineReactTable
        columns={[
          {
            columns: [
              { accessorKey: 'firstName', footer: 'f1', header: 'First Name' },
              { accessorKey: 'lastName', footer: 'f2', header: 'Last Name' },
            ],
            footer: 'group footer',
            header: 'Name',
            id: 'name',
          },
        ]}
        data={people}
        enableColumnVirtualization
      />,
    );
    await waitFor(() => expect(screen.getByText('f2')).toBeInTheDocument());
    expect(screen.getByText('group footer')).toBeInTheDocument();
  });
});

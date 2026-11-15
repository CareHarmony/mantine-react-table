import { people, type Person } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import {
  MantineReactTable,
  type MRT_ColumnDef,
} from '@careharmony/mantine-react-table-ng';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const centeredColumns: MRT_ColumnDef<Person>[] = [
  {
    accessorKey: 'firstName',
    header: 'First Name',
    mantineTableBodyCellProps: { align: 'center' },
    mantineTableHeadCellProps: { align: 'center' },
  },
];

const labelsPaddingLeft = () =>
  (
    screen
      .getByText('First Name')
      .closest('.mrt-table-head-cell-labels') as HTMLElement
  ).style.getPropertyValue('--mrt-table-head-cell-labels-padding-left');

describe('issue 512: centered header without header buttons', () => {
  it('adds no left padding when the header has no buttons', () => {
    renderWithMantine(
      <MantineReactTable
        columns={centeredColumns}
        data={people}
        enableColumnActions={false}
        enableColumnFilters={false}
        enableSorting={false}
      />,
    );
    expect(labelsPaddingLeft()).toBe('0');
  });

  it('still offsets the label by the width of the buttons that do render', () => {
    renderWithMantine(
      <MantineReactTable columns={centeredColumns} data={people} />,
    );
    expect(Number(labelsPaddingLeft())).toBeGreaterThan(0);
  });
});

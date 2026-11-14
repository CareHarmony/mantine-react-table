import { MantineProvider } from '@mantine/core';

import { render, screen } from '@testing-library/react';
import { MantineReactTable, type MRT_ColumnDef } from 'mantine-react-table-ng';
import { describe, expect, it } from 'vitest';

type Customer = {
  address: { city: string };
  name: string;
  tags: string[];
};

const customers: Customer[] = [
  { address: { city: 'Omaha' }, name: 'Ada', tags: ['a', 'b'] },
  { address: { city: 'Boise' }, name: 'Ben', tags: ['c'] },
];

const customerColumns: MRT_ColumnDef<Customer>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorFn: (row) => row.address.city, header: 'City', id: 'city' },
  {
    accessorFn: (row) => row.tags.join(', ').toUpperCase(),
    header: 'Tags',
    id: 'tags',
  },
];

const Table = ({
  data,
  isLoading,
}: {
  data: Customer[];
  isLoading: boolean;
}) => (
  <MantineProvider>
    <MantineReactTable
      columns={customerColumns}
      data={data}
      state={{ isLoading }}
    />
  </MantineProvider>
);

describe('issue 523: accessorFn with skeleton rows', () => {
  it('renders skeleton rows without calling accessorFn on placeholder data', () => {
    const { container } = render(<Table data={[]} isLoading />);
    expect(
      container.querySelectorAll('tbody .mantine-Skeleton-root').length,
    ).toBeGreaterThan(0);
  });

  it('also survives sorting and showSkeletons', () => {
    const { container } = render(
      <MantineProvider>
        <MantineReactTable
          columns={customerColumns}
          data={[]}
          initialState={{ sorting: [{ desc: false, id: 'city' }] }}
          state={{ showSkeletons: true }}
        />
      </MantineProvider>,
    );
    expect(
      container.querySelectorAll('tbody .mantine-Skeleton-root').length,
    ).toBeGreaterThan(0);
  });

  it('calls accessorFn on real rows once loading ends', () => {
    const { rerender } = render(<Table data={[]} isLoading />);
    rerender(<Table data={customers} isLoading={false} />);
    expect(screen.getByText('Omaha')).toBeInTheDocument();
    expect(screen.getByText('A, B')).toBeInTheDocument();
  });
});

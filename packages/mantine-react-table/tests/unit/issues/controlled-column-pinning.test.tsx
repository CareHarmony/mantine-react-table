import { useState } from 'react';

import { renderWithMantine } from '../fixtures/render';

import {
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_ColumnPinningState,
} from '@careharmony/mantine-react-table-ng';
import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

type Person = { firstName: string; lastName: string };

const columns: MRT_ColumnDef<Person>[] = [
  { accessorKey: 'firstName', header: 'First Name' },
  { accessorKey: 'lastName', header: 'Last Name' },
];
const data: Person[] = [{ firstName: 'Ada', lastName: 'Lovelace' }];

//the docs prop tables pin columns from `state` once a media query matches
const PinnedLater = () => {
  const [columnPinning, setColumnPinning] = useState<MRT_ColumnPinningState>(
    {},
  );
  return (
    <>
      <button onClick={() => setColumnPinning({ left: ['lastName'] })}>
        pin
      </button>
      <MantineReactTable
        columns={columns}
        data={data}
        enableColumnPinning
        onColumnPinningChange={setColumnPinning}
        state={{ columnPinning }}
      />
    </>
  );
};

describe(`controlled column pinning [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  it('pins a column when `state.columnPinning` changes after mount', async () => {
    const { container, user } = renderWithMantine(<PinnedLater />);
    expect(container.querySelector('th[data-column-pinned]')).toBeNull();
    await user.click(container.querySelector('button')!);
    await waitFor(() =>
      expect(
        container.querySelector('th[data-column-pinned]'),
      ).toHaveTextContent('Last Name'),
    );
    expect(container.querySelector('td[data-column-pinned]')).toHaveTextContent(
      'Lovelace',
    );
  });
});

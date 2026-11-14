import { useState } from 'react';

import { columns, people, type Person } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import { screen } from '@testing-library/react';
import {
  MantineReactTable,
  type MRT_Row,
  useMantineReactTable,
} from 'mantine-react-table-ng';
import { describe, expect, it, vi } from 'vitest';

const onCreatingRowChangeSpy = vi.fn();

const ControlledCreatingRowTable = () => {
  const [creatingRow, setCreatingRow] = useState<MRT_Row<Person> | null>(null);
  const table = useMantineReactTable({
    columns,
    createDisplayMode: 'row',
    data: people,
    enableEditing: true,
    onCreatingRowChange: (row) => {
      onCreatingRowChangeSpy(row);
      setCreatingRow(row as MRT_Row<Person> | null);
    },
    state: { creatingRow },
  });
  return (
    <>
      <output data-testid="creating">{creatingRow?.id ?? 'none'}</output>
      <button onClick={() => table.setCreatingRow(true)}>create</button>
      <MantineReactTable table={table} />
    </>
  );
};

describe('issue 157: onCreatingRowChange', () => {
  it('is called when a row starts and stops being created', async () => {
    const { user } = renderWithMantine(<ControlledCreatingRowTable />);
    expect(screen.getByTestId('creating')).toHaveTextContent('none');

    await user.click(screen.getByText('create'));
    expect(onCreatingRowChangeSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('creating')).toHaveTextContent('mrt-row-create');

    await user.click(screen.getByLabelText('Cancel'));
    expect(onCreatingRowChangeSpy).toHaveBeenLastCalledWith(null);
    expect(screen.getByTestId('creating')).toHaveTextContent('none');
  });
});

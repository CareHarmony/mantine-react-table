import { columns, manyPeople } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';
import { mockElementSizes } from './virtualization';

import { MantineReactTable } from '@careharmony/mantine-react-table-ng';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const data = manyPeople(40);

const checkbox = (index: number) => screen.getAllByRole('checkbox')[index];

describe('issue 549: memoMode rows and row selection', () => {
  it('checks a row checkbox with row virtualization', async () => {
    mockElementSizes();
    const { user } = renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={data}
        enablePagination={false}
        enableRowSelection
        enableRowVirtualization
        getRowId={(row) => row.id}
        memoMode="rows"
      />,
    );
    await waitFor(() =>
      expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(2),
    );
    await user.click(checkbox(1));
    await waitFor(() => expect(checkbox(1)).toBeChecked());
    await user.click(checkbox(2));
    await waitFor(() => expect(checkbox(2)).toBeChecked());
    await user.click(checkbox(1));
    await waitFor(() => expect(checkbox(1)).not.toBeChecked());
    expect(checkbox(2)).toBeChecked();
  });

  it('checks a row checkbox without row virtualization', async () => {
    const { user } = renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={data}
        enableRowSelection
        getRowId={(row) => row.id}
        memoMode="rows"
      />,
    );
    await user.click(checkbox(1));
    await waitFor(() => expect(checkbox(1)).toBeChecked());
    //select all on the page
    await user.click(checkbox(0));
    await waitFor(() => expect(checkbox(3)).toBeChecked());
  });
});

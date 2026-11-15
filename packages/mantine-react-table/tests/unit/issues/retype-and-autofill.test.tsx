import { columns, people } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import { MantineReactTable } from '@careharmony/mantine-react-table-ng';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const bodyRowCount = () =>
  screen.getAllByRole('row').filter((row) => row.closest('tbody')).length;

describe(`retyped filters and auto-filled edits [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  it('applies a search that is cleared and retyped before the debounce ends', async () => {
    const { user } = renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={people}
        initialState={{ showGlobalFilter: true }}
      />,
    );
    const search = screen.getByPlaceholderText('Search');
    await user.type(search, 'Ada');
    await waitFor(() => expect(bodyRowCount()).toBe(1));

    //the debounced value was 'Ada' before and after, so it never changed
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    await user.type(search, 'Ada');
    expect(search).toHaveValue('Ada');
    await waitFor(() => expect(bodyRowCount()).toBe(1));
  });

  it('applies a column filter that is cleared and retyped before the debounce ends', async () => {
    const { user } = renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={people}
        initialState={{ showColumnFilters: true }}
      />,
    );
    const filter = screen.getByPlaceholderText('Filter by First Name');
    await user.type(filter, 'Ada');
    await waitFor(() => expect(bodyRowCount()).toBe(1));

    await user.click(
      screen.getAllByRole('button', { name: 'Clear filter' })[0],
    );
    await user.type(filter, 'Ada');
    expect(filter).toHaveValue('Ada');
    await waitFor(() => expect(bodyRowCount()).toBe(1));
  });

  it('saves a value the browser filled into an edit input without a change event', async () => {
    const onEditingRowSave = vi.fn();
    const { user } = renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={people}
        editDisplayMode="row"
        enableEditing
        getRowId={(row) => row.id}
        onEditingRowSave={onEditingRowSave}
      />,
    );
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    //browser autofill writes the DOM value directly
    screen.getByPlaceholderText<HTMLInputElement>('City').value = 'Autofilled';
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onEditingRowSave).toHaveBeenCalledTimes(1);
    //untouched values keep their type: age stays a number
    expect(onEditingRowSave.mock.calls[0][0].values).toMatchObject({
      age: 31,
      city: 'Autofilled',
      firstName: 'Ada',
    });
  });
});

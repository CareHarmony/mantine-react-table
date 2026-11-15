import { columns, people } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import { MantineReactTable } from '@careharmony/mantine-react-table-ng';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('PR 258: Enter key during IME composition', () => {
  it('keeps the cell in edit mode until Enter is pressed outside a composition', async () => {
    const { user } = renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={people}
        editDisplayMode="cell"
        enableEditing
      />,
    );
    await user.dblClick(screen.getByText('Ada'));
    const input = await screen.findByDisplayValue('Ada');
    await user.click(input);
    expect(input).toHaveFocus();

    //Enter that confirms the IME candidate
    fireEvent.keyDown(input, { isComposing: true, key: 'Enter' });
    expect(input).toHaveFocus();
    expect(screen.getByDisplayValue('Ada')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(screen.queryByDisplayValue('Ada')).not.toBeInTheDocument(),
    );
  });

  it('keeps the filter popover open while composing', async () => {
    const { user } = renderWithMantine(
      <MantineReactTable
        columnFilterDisplayMode="popover"
        columns={columns}
        data={people}
      />,
    );
    await user.click(screen.getByLabelText('Filter by First Name'));
    const input = await screen.findByPlaceholderText('Filter by First Name');

    fireEvent.keyDown(input, { isComposing: true, key: 'Enter' });
    expect(
      screen.getByPlaceholderText('Filter by First Name'),
    ).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText('Filter by First Name'),
      ).not.toBeInTheDocument(),
    );
  });
});

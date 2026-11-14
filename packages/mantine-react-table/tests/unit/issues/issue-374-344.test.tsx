/**
 * Neither report reproduces in jsdom on the current source. These tests cover
 * the reported setups (row virtualization with exactly one row) so that a
 * regression in the row count handling still fails here.
 */
import { columns, manyPeople, people } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';
import { mockElementSizes } from './virtualization';

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MantineReactTable } from 'mantine-react-table-ng';
import { describe, expect, it } from 'vitest';

const onePerson = people.slice(0, 1);
const fiftyPeople = manyPeople(50);

const bodyRowText = () =>
  Array.from(document.querySelectorAll('tbody tr')).map((tr) => tr.textContent);

describe('issue 374: column resizing with one virtualized row', () => {
  it('keeps the row while a column is resized and after', async () => {
    mockElementSizes();
    renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={onePerson}
        enableColumnResizing
        enablePagination={false}
        enableRowVirtualization
      />,
    );
    await waitFor(() => expect(bodyRowText()).toEqual(['AdaYoung31Omaha']));

    const handle = document.querySelector(
      '.mrt-table-head-cell-resize-handle',
    ) as HTMLElement;
    expect(handle).toBeInTheDocument();
    fireEvent.mouseDown(handle, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 140 });
    await waitFor(() => expect(bodyRowText()).toEqual(['AdaYoung31Omaha']));
    fireEvent.mouseUp(document, { clientX: 140 });
    await waitFor(() => expect(bodyRowText()).toEqual(['AdaYoung31Omaha']));
  });
});

describe('issue 344: one filtered row with row virtualization', () => {
  it('shows the single row that matches a column filter', async () => {
    mockElementSizes();
    const { user } = renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={fiftyPeople}
        enableFilterMatchHighlighting={false}
        enablePagination={false}
        enableRowVirtualization
        initialState={{ showColumnFilters: true }}
      />,
    );
    await waitFor(() => expect(bodyRowText().length).toBeGreaterThan(5));

    await user.type(screen.getByPlaceholderText('Filter by City'), 'City 49');
    await waitFor(() =>
      expect(bodyRowText()).toEqual(['First49Last4969City 49']),
    );

    await user.clear(screen.getByPlaceholderText('Filter by City'));
    await waitFor(() => expect(bodyRowText().length).toBeGreaterThan(5));
  });
});

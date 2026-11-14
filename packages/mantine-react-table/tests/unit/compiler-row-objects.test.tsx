import { renderWithMantine } from './fixtures/render';
import { RowObjectComponentsTable } from './fixtures/RowObjects';

import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe(`row, cell and column objects [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  it('keeps a row-only component current through selection changes', async () => {
    const { user } = renderWithMantine(<RowObjectComponentsTable />);
    expect(screen.getByTestId('toggle-p2')).toHaveTextContent('select');

    await user.click(screen.getByTestId('toggle-p2'));
    expect(screen.getByTestId('toggle-p2')).toHaveTextContent('unselect');
    expect(screen.getByTestId('flags-p2_firstName')).toHaveTextContent(
      'selected|unpinned',
    );
    expect(screen.getByTestId('toggle-p3')).toHaveTextContent('select');

    //the cached click handler must not keep the first selection value
    await user.click(screen.getByTestId('toggle-p2'));
    expect(screen.getByTestId('toggle-p2')).toHaveTextContent('select');
    await user.click(screen.getByTestId('toggle-p2'));
    expect(screen.getByTestId('toggle-p2')).toHaveTextContent('unselect');
  });

  it('keeps a row-only component current through expansion changes', async () => {
    const { user } = renderWithMantine(<RowObjectComponentsTable />);
    expect(screen.getByTestId('expansion-p1')).toHaveTextContent('closed');
    const expandButton = screen.getAllByRole('button', { name: 'Expand' })[0];
    await user.click(expandButton);
    expect(screen.getByTestId('expansion-p1')).toHaveTextContent('open');
    expect(screen.getByTestId('expansion-p2')).toHaveTextContent('closed');
    await user.click(expandButton);
    expect(screen.getByTestId('expansion-p1')).toHaveTextContent('closed');
  });

  it('keeps a column-only header component current through sorting and filtering', async () => {
    const { user } = renderWithMantine(<RowObjectComponentsTable />);
    expect(screen.getByTestId('sort-firstName')).toHaveTextContent('unsorted|');

    await user.click(screen.getByText('First Name'));
    expect(screen.getByTestId('sort-firstName')).toHaveTextContent('asc|');
    await user.click(screen.getByText('First Name'));
    expect(screen.getByTestId('sort-firstName')).toHaveTextContent('desc|');

    await user.type(screen.getByPlaceholderText('Filter by First Name'), 'e');
    await waitFor(() =>
      expect(screen.getByTestId('sort-firstName')).toHaveTextContent('desc|e'),
    );
  });

  it('keeps cell-only and footer components current through column pinning', async () => {
    const { user } = renderWithMantine(<RowObjectComponentsTable />);
    expect(screen.getByTestId('flags-p1_firstName')).toHaveTextContent(
      'idle|unpinned',
    );
    expect(screen.getByTestId('footer-firstName')).toHaveTextContent(
      'unpinned',
    );
    await user.click(screen.getByText('pin first name'));
    expect(screen.getByTestId('flags-p1_firstName')).toHaveTextContent(
      'idle|left',
    );
    expect(screen.getByTestId('footer-firstName')).toHaveTextContent('left');
  });
});

import {
  ChangingOptionsTable,
  ControlledStateTable,
  CustomHeadlessTable,
  HookTable,
  PropsTable,
  RowObjectTable,
  TableWithChildReader,
} from './fixtures/ConsumerTables';
import { renderWithMantine } from './fixtures/render';

import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const bodyRows = () =>
  screen
    .getAllByRole('row')
    .filter(
      (row) =>
        row.closest('tbody') && !row.classList.contains('mantine-Table-tr-detail-panel'),
    );

const firstColumnText = (cellIndex = 0) =>
  bodyRows().map(
    (row) => within(row).getAllByRole('cell')[cellIndex].textContent,
  );

describe(`consumer code [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  describe('table instance read next to the hook', () => {
    it('reflects row selection made inside the table', async () => {
      const { user } = renderWithMantine(<HookTable />);
      expect(screen.getByTestId('selected-count')).toHaveTextContent('0');

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
      await user.click(checkboxes[2]);
      expect(screen.getByTestId('selected-count')).toHaveTextContent('2');
      await user.click(checkboxes[1]);
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1');
    });

    it('reflects sorting made inside the table', async () => {
      const { user } = renderWithMantine(<HookTable />);
      expect(screen.getByTestId('sorting')).toHaveTextContent('[]');
      await user.click(screen.getByText('First Name'));
      expect(screen.getByTestId('sorting')).toHaveTextContent(
        '[{"id":"firstName","desc":false}]',
      );
      await user.click(screen.getByText('First Name'));
      expect(screen.getByTestId('sorting')).toHaveTextContent(
        '[{"id":"firstName","desc":true}]',
      );
      expect(firstColumnText(1)[0]).toBe('Eli');
    });

    it('updates the table when consumer code calls table setters', async () => {
      const { user } = renderWithMantine(<HookTable />);
      await user.click(screen.getByText('set density xs'));
      expect(screen.getByTestId('density')).toHaveTextContent('xs');

      await user.click(screen.getByText('select all'));
      expect(screen.getByTestId('selected-count')).toHaveTextContent('5');
      for (const checkbox of screen.getAllByRole('checkbox')) {
        expect(checkbox).toBeChecked();
      }

      await user.click(screen.getByText('open filters'));
      expect(screen.getByTestId('show-filters')).toHaveTextContent('true');
      expect(
        screen.getByPlaceholderText('Filter by First Name'),
      ).toBeInTheDocument();
    });

    it('re-renders a child component that only receives the table', async () => {
      const { user } = renderWithMantine(<TableWithChildReader />);
      expect(screen.getByTestId('badge-selected-count')).toHaveTextContent('0');
      await user.click(screen.getAllByRole('checkbox')[3]);
      expect(screen.getByTestId('badge-selected-count')).toHaveTextContent('1');
    });
  });

  describe('consumer-owned state', () => {
    it('applies sorting set by the consumer', async () => {
      const { user } = renderWithMantine(<ControlledStateTable />);
      expect(firstColumnText()[0]).toBe('Ada');
      await user.click(screen.getByText('sort age desc'));
      expect(firstColumnText()[0]).toBe('Dee');
      expect(screen.getByTestId('sorting')).toHaveTextContent('age');
    });

    it('reports sorting clicked in the header back to the consumer', async () => {
      const { user } = renderWithMantine(<ControlledStateTable />);
      await user.click(screen.getByText('Last Name'));
      expect(screen.getByTestId('sorting')).toHaveTextContent(
        '[{"id":"lastName","desc":false}]',
      );
      expect(firstColumnText()[0]).toBe('Eli');
    });

    it('applies a global filter set by the consumer', async () => {
      const { user } = renderWithMantine(<ControlledStateTable />);
      expect(bodyRows()).toHaveLength(5);
      await user.click(screen.getByText('filter Tulsa'));
      expect(bodyRows()).toHaveLength(1);
      expect(firstColumnText()[0]).toBe('Cy');
    });
  });

  describe('changing options', () => {
    it('renders added and removed rows', async () => {
      const { user } = renderWithMantine(<ChangingOptionsTable />);
      expect(bodyRows()).toHaveLength(5);
      await user.click(screen.getByText('add row'));
      expect(bodyRows()).toHaveLength(6);
      expect(screen.getByText('Fargo')).toBeInTheDocument();
      await user.click(screen.getByText('remove first'));
      expect(bodyRows()).toHaveLength(5);
      expect(screen.queryByText('Omaha')).not.toBeInTheDocument();
    });

    it('re-runs render callbacks that close over consumer state', async () => {
      const { user } = renderWithMantine(<ChangingOptionsTable />);
      expect(screen.getByTestId('toolbar-count')).toHaveTextContent('0');
      await user.click(screen.getByText('increment'));
      await user.click(screen.getByText('increment'));
      expect(screen.getByTestId('toolbar-count')).toHaveTextContent('2');
      expect(screen.getByTestId('bottom-count')).toHaveTextContent('2');
    });

    it('renders a changed column list', async () => {
      const { user } = renderWithMantine(<ChangingOptionsTable />);
      expect(screen.getByText('City')).toBeInTheDocument();
      await user.click(screen.getByText('hide city'));
      expect(screen.queryByText('City')).not.toBeInTheDocument();
      expect(screen.queryByText('Omaha')).not.toBeInTheDocument();
    });

    it('applies consumer state passed through the state option', async () => {
      const { user } = renderWithMantine(<ChangingOptionsTable />);
      expect(
        document.querySelector('.mantine-LoadingOverlay-root'),
      ).not.toBeInTheDocument();
      await user.click(screen.getByText('toggle loading'));
      expect(
        document.querySelector('.mantine-LoadingOverlay-root'),
      ).toBeInTheDocument();
    });
  });

  describe('props API', () => {
    it('selects rows and follows data changes', async () => {
      const { user } = renderWithMantine(<PropsTable />);
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      expect(checkboxes[1]).toBeChecked();
      expect(screen.getByText(/1 of 5 row\(s\) selected/)).toBeInTheDocument();
      await user.click(screen.getByText('keep two'));
      expect(bodyRows()).toHaveLength(2);
    });
  });

  describe('headless sub-components', () => {
    it('paginates through MRT_TablePagination', async () => {
      const { user } = renderWithMantine(<CustomHeadlessTable />);
      expect(firstColumnText(1)).toEqual(['Ada', 'Ben']);
      await user.click(screen.getByRole('button', { name: '2' }));
      expect(firstColumnText(1)).toEqual(['Cy', 'Dee']);
      expect(screen.getByTestId('page-index')).toHaveTextContent('1');
    });

    it('toggles filters through MRT_ToolbarInternalButtons', async () => {
      const { user } = renderWithMantine(<CustomHeadlessTable />);
      expect(
        screen.getByPlaceholderText('Filter by First Name'),
      ).not.toBeVisible();
      await user.click(
        screen.getByRole('button', { name: 'Show/Hide filters' }),
      );
      await waitFor(() =>
        expect(
          screen.getByPlaceholderText('Filter by First Name'),
        ).toBeVisible(),
      );
      expect(screen.getByTestId('headless-filters')).toHaveTextContent('true');
    });
  });

  describe('row objects passed to compiled consumer components', () => {
    it('shows current selection in a component that receives a row', async () => {
      const { user } = renderWithMantine(<RowObjectTable />);
      expect(screen.getByTestId('marker-p2')).toHaveTextContent('idle');
      await user.click(screen.getByTestId('action-p2'));
      expect(screen.getByTestId('marker-p2')).toHaveTextContent('selected');
      expect(screen.getByTestId('action-p2')).toHaveTextContent('unselect');
      await user.click(screen.getByTestId('action-p2'));
      expect(screen.getByTestId('marker-p2')).toHaveTextContent('idle');
    });

    it('shows current expansion in a component that receives a row', async () => {
      const { user } = renderWithMantine(<RowObjectTable />);
      expect(screen.getByTestId('expanded-p1')).toHaveTextContent('closed');
      await user.click(screen.getAllByRole('button', { name: 'Expand' })[0]);
      expect(screen.getByTestId('expanded-p1')).toHaveTextContent('open');
      expect(screen.getByTestId('detail-p1')).toHaveTextContent('Omaha');
    });
  });
});

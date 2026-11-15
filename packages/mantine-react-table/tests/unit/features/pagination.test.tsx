import { columns, manyPeople, type Person } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import {
  MantineReactTable,
  type MRT_TableOptions,
  useMantineReactTable,
} from '@careharmony/mantine-react-table-ng';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const getRowId = (row: Person) => row.id;
const fortyFive = manyPeople(45);
const fifteen = manyPeople(15);

//prints the table state next to the table, like a consumer that reads `table.getState()`
const StateTable = (options: Partial<MRT_TableOptions<Person>>) => {
  const table = useMantineReactTable({
    columns,
    data: fortyFive,
    getRowId,
    ...options,
  });
  const { pagination } = table.getState();
  return (
    <>
      <output data-testid="pagination">{JSON.stringify(pagination)}</output>
      <MantineReactTable table={table} />
    </>
  );
};

const pagination = () =>
  JSON.parse(screen.getByTestId('pagination').textContent ?? '{}');

const bodyRows = () =>
  screen.getAllByRole('row').filter((row) => row.closest('tbody'));

const firstNames = () =>
  bodyRows().map((row) => within(row).getAllByRole('cell')[0].textContent);

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `First${from + i}`);

const button = (name: string) => screen.getByRole('button', { name });

const paginationRoot = () => {
  const root = document.querySelector('.mrt-table-pagination');
  if (!root) throw new Error('no pagination');
  return root as HTMLElement;
};

//Mantine Pagination control order: first, previous, pages..., next, last
const pageControls = () =>
  Array.from(
    paginationRoot().querySelectorAll<HTMLButtonElement>(
      '.mantine-Pagination-control',
    ),
  );

const activePage = () =>
  paginationRoot().querySelector('.mantine-Pagination-control[data-active]')
    ?.textContent;

describe(`pagination [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  describe('default display mode', () => {
    it('shows the first page with first and previous disabled', () => {
      renderWithMantine(<StateTable />);
      expect(firstNames()).toEqual(range(0, 9));
      expect(screen.getByText('1-10 of 45')).toBeInTheDocument();
      expect(button('Go to first page')).toBeDisabled();
      expect(button('Go to previous page')).toBeDisabled();
      expect(button('Go to next page')).toBeEnabled();
      expect(button('Go to last page')).toBeEnabled();
    });

    it('goes to the next and the previous page', async () => {
      const { user } = renderWithMantine(<StateTable />);
      await user.click(button('Go to next page'));
      await waitFor(() => expect(firstNames()).toEqual(range(10, 19)));
      expect(screen.getByText('11-20 of 45')).toBeInTheDocument();
      expect(pagination()).toEqual({ pageIndex: 1, pageSize: 10 });
      expect(button('Go to previous page')).toBeEnabled();

      await user.click(button('Go to next page'));
      await waitFor(() => expect(firstNames()).toEqual(range(20, 29)));
      expect(screen.getByText('21-30 of 45')).toBeInTheDocument();

      await user.click(button('Go to previous page'));
      await waitFor(() => expect(firstNames()).toEqual(range(10, 19)));
      expect(screen.getByText('11-20 of 45')).toBeInTheDocument();
      expect(pagination()).toEqual({ pageIndex: 1, pageSize: 10 });
    });

    it('goes to the last and the first page', async () => {
      const { user } = renderWithMantine(<StateTable />);
      await user.click(button('Go to last page'));
      await waitFor(() => expect(firstNames()).toEqual(range(40, 44)));
      expect(screen.getByText('41-45 of 45')).toBeInTheDocument();
      expect(pagination()).toEqual({ pageIndex: 4, pageSize: 10 });
      expect(button('Go to next page')).toBeDisabled();
      expect(button('Go to last page')).toBeDisabled();
      expect(button('Go to first page')).toBeEnabled();

      await user.click(button('Go to first page'));
      await waitFor(() => expect(firstNames()).toEqual(range(0, 9)));
      expect(screen.getByText('1-10 of 45')).toBeInTheDocument();
      expect(pagination()).toEqual({ pageIndex: 0, pageSize: 10 });
      expect(button('Go to first page')).toBeDisabled();
    });

    it('changes the rows per page', async () => {
      const { user } = renderWithMantine(<StateTable />);
      const select = screen.getByRole('combobox', { name: 'Rows per page' });
      expect(select).toHaveValue('10');

      await user.click(select);
      await user.click(await screen.findByRole('option', { name: '5' }));

      await waitFor(() => expect(firstNames()).toEqual(range(0, 4)));
      expect(screen.getByText('1-5 of 45')).toBeInTheDocument();
      expect(pagination().pageSize).toBe(5);
      expect(
        screen.getByRole('combobox', { name: 'Rows per page' }),
      ).toHaveValue('5');

      await user.click(button('Go to last page'));
      await waitFor(() => expect(firstNames()).toEqual(range(40, 44)));
      expect(pagination()).toEqual({ pageIndex: 8, pageSize: 5 });
    });

    it('offers the rows per page options from mantinePaginationProps', async () => {
      const { user } = renderWithMantine(
        <StateTable
          initialState={{ pagination: { pageIndex: 0, pageSize: 3 } }}
          mantinePaginationProps={{ rowsPerPageOptions: ['3', '7'] }}
        />,
      );
      expect(firstNames()).toEqual(range(0, 2));
      await user.click(screen.getByRole('combobox', { name: 'Rows per page' }));
      await screen.findByRole('option', { name: '7' });
      expect(
        screen.getAllByRole('option').map((option) => option.textContent),
      ).toEqual(['3', '7']);

      await user.click(screen.getByRole('option', { name: '7' }));
      await waitFor(() => expect(firstNames()).toEqual(range(0, 6)));
      expect(screen.getByText('1-7 of 45')).toBeInTheDocument();
    });

    it('hides the rows per page select with showRowsPerPage off', () => {
      renderWithMantine(
        <StateTable mantinePaginationProps={{ showRowsPerPage: false }} />,
      );
      expect(screen.queryByText('Rows per page')).toBeNull();
      expect(screen.getByText('1-10 of 45')).toBeInTheDocument();
    });

    it('has no first and last buttons for two pages', async () => {
      const { user } = renderWithMantine(<StateTable data={fifteen} />);
      expect(screen.getByText('1-10 of 15')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Go to first page' }),
      ).toBeNull();
      expect(
        screen.queryByRole('button', { name: 'Go to last page' }),
      ).toBeNull();

      await user.click(button('Go to next page'));
      await waitFor(() => expect(firstNames()).toEqual(range(10, 14)));
      expect(screen.getByText('11-15 of 15')).toBeInTheDocument();
      expect(button('Go to next page')).toBeDisabled();
    });

    it('shows 0-0 of 0 for no rows', () => {
      renderWithMantine(<StateTable data={[]} />);
      expect(screen.getByText('0-0 of 0')).toBeInTheDocument();
      expect(button('Go to next page')).toBeDisabled();
      expect(button('Go to previous page')).toBeDisabled();
    });

    it('uses rowCount for the total with manual pagination', () => {
      renderWithMantine(
        <StateTable
          data={fifteen.slice(0, 10)}
          manualPagination
          rowCount={95}
        />,
      );
      expect(screen.getByText('1-10 of 95')).toBeInTheDocument();
      expect(button('Go to last page')).toBeEnabled();
    });
  });

  describe('pages display mode', () => {
    it('shows one control per page and marks the first page active', () => {
      renderWithMantine(<StateTable paginationDisplayMode="pages" />);
      expect(firstNames()).toEqual(range(0, 9));
      expect(activePage()).toBe('1');
      expect(pageControls().map((control) => control.textContent)).toEqual([
        '',
        '',
        '1',
        '2',
        '3',
        '4',
        '5',
        '',
        '',
      ]);
      const controls = pageControls();
      expect(controls[0]).toBeDisabled();
      expect(controls[1]).toBeDisabled();
      expect(controls.at(-1)).toBeEnabled();
      expect(screen.queryByText('1-10 of 45')).toBeNull();
    });

    it('goes to a page by its number', async () => {
      const { user } = renderWithMantine(
        <StateTable paginationDisplayMode="pages" />,
      );
      await user.click(button('3'));
      await waitFor(() => expect(firstNames()).toEqual(range(20, 29)));
      expect(activePage()).toBe('3');
      expect(pagination()).toEqual({ pageIndex: 2, pageSize: 10 });
    });

    it('goes to the next, previous, last and first page', async () => {
      const { user } = renderWithMantine(
        <StateTable paginationDisplayMode="pages" />,
      );
      await user.click(pageControls().at(-2)!);
      await waitFor(() => expect(activePage()).toBe('2'));
      expect(firstNames()).toEqual(range(10, 19));

      await user.click(pageControls().at(-1)!);
      await waitFor(() => expect(activePage()).toBe('5'));
      expect(firstNames()).toEqual(range(40, 44));
      expect(pagination()).toEqual({ pageIndex: 4, pageSize: 10 });
      expect(pageControls().at(-1)).toBeDisabled();
      expect(pageControls().at(-2)).toBeDisabled();

      await user.click(pageControls()[1]);
      await waitFor(() => expect(activePage()).toBe('4'));
      expect(firstNames()).toEqual(range(30, 39));

      await user.click(pageControls()[0]);
      await waitFor(() => expect(activePage()).toBe('1'));
      expect(firstNames()).toEqual(range(0, 9));
      expect(pagination()).toEqual({ pageIndex: 0, pageSize: 10 });
    });

    it('changes the rows per page', async () => {
      const { user } = renderWithMantine(
        <StateTable paginationDisplayMode="pages" />,
      );
      await user.click(screen.getByRole('combobox', { name: 'Rows per page' }));
      await user.click(await screen.findByRole('option', { name: '25' }));

      await waitFor(() => expect(firstNames()).toEqual(range(0, 24)));
      expect(pagination().pageSize).toBe(25);
      //two pages: 1 and 2 between previous and next, no first and last controls
      expect(pageControls().map((control) => control.textContent)).toEqual([
        '',
        '1',
        '2',
        '',
      ]);
    });
  });

  describe('position', () => {
    it('renders one pagination in each toolbar with positionPagination both', async () => {
      const { user } = renderWithMantine(
        <StateTable positionPagination="both" />,
      );
      expect(document.querySelectorAll('.mrt-table-pagination')).toHaveLength(
        2,
      );
      expect(screen.getAllByText('1-10 of 45')).toHaveLength(2);

      await user.click(
        screen.getAllByRole('button', { name: 'Go to next page' })[0],
      );
      await waitFor(() =>
        expect(screen.getAllByText('11-20 of 45')).toHaveLength(2),
      );
      expect(firstNames()).toEqual(range(10, 19));
    });

    it('renders no pagination with enablePagination off', () => {
      renderWithMantine(<StateTable enablePagination={false} />);
      expect(document.querySelector('.mrt-table-pagination')).toBeNull();
      expect(bodyRows()).toHaveLength(45);
    });
  });
});

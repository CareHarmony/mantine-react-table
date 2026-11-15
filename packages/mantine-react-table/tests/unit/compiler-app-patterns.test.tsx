import {
  ControlledColumnOrderTable,
  DestructuredTable,
  EditingTable,
  RowModelReaderTable,
  ServerSideTable,
  ShowHideColumnsHarness,
  TableEffectCounter,
  UncontrolledColumnOrderTable,
  VirtualizedTable,
} from './fixtures/AppPatterns';
import { type Person } from './fixtures/data';
import { renderWithMantine } from './fixtures/render';

import { type MRT_TableInstance } from '@careharmony/mantine-react-table-ng';
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const bodyRows = () =>
  screen.getAllByRole('row').filter((row) => row.closest('tbody'));

const columnText = (cellIndex = 0) =>
  bodyRows().map(
    (row) => within(row).getAllByRole('cell')[cellIndex].textContent,
  );

const headerText = () =>
  screen
    .getAllByRole('columnheader')
    .map((header) => header.textContent?.trim())
    .filter(Boolean);

describe(`application patterns [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  describe('server-side sorting, filtering and pagination', () => {
    it('sorts through the header and re-queries', async () => {
      const { user } = renderWithMantine(<ServerSideTable />);
      expect(columnText()).toEqual(['Ada', 'Ben']);

      await user.click(screen.getByText('Age'));
      expect(screen.getByTestId('query')).toHaveTextContent(
        '"sorting":[{"id":"age","desc":true}]',
      );
      expect(columnText()).toEqual(['Dee', 'Ben']);

      await user.click(screen.getByText('Age'));
      expect(screen.getByTestId('query')).toHaveTextContent(
        '"sorting":[{"id":"age","desc":false}]',
      );
      expect(columnText()).toEqual(['Cy', 'Ada']);

      await user.click(screen.getByText('Age'));
      expect(screen.getByTestId('query')).toHaveTextContent('"sorting":[]');
      expect(columnText()).toEqual(['Ada', 'Ben']);
    });

    it('shows the sort direction on the header that is sorted', async () => {
      const { user } = renderWithMantine(<ServerSideTable />);
      await user.click(screen.getByText('City'));
      expect(
        screen.getByRole('button', { name: 'Sorted by City ascending' }),
      ).toBeInTheDocument();
      await user.click(screen.getByText('City'));
      expect(
        screen.getByRole('button', { name: 'Sorted by City descending' }),
      ).toBeInTheDocument();
    });

    it('pages through server rows', async () => {
      const { user } = renderWithMantine(<ServerSideTable />);
      await user.click(screen.getByRole('button', { name: '2' }));
      expect(screen.getByTestId('query')).toHaveTextContent('"pageIndex":1');
      expect(columnText()).toEqual(['Cy', 'Dee']);
      await user.click(screen.getByRole('button', { name: '3' }));
      expect(columnText()).toEqual(['Eli']);
    });

    it('filters through a column filter input', async () => {
      const { user } = renderWithMantine(<ServerSideTable />);
      await user.type(screen.getByPlaceholderText('Filter by City'), 'reno');
      await waitFor(() =>
        expect(screen.getByTestId('query')).toHaveTextContent(
          '"columnFilters":[{"id":"city","value":"reno"}]',
        ),
      );
      expect(columnText()).toEqual(['Eli']);
    });
  });

  describe('column ordering', () => {
    it('applies a column order set by the consumer', async () => {
      const { user } = renderWithMantine(<ControlledColumnOrderTable />);
      expect(headerText()).toEqual(['First Name', 'Last Name', 'Age', 'City']);
      await user.click(screen.getByText('reverse order'));
      expect(headerText()).toEqual(['City', 'Age', 'Last Name', 'First Name']);
      expect(columnText()[0]).toBe('Omaha');
      expect(screen.getByTestId('column-order')).toHaveTextContent(
        'city,age,lastName,firstName',
      );
    });

    it('applies column visibility set by the consumer', async () => {
      const { user } = renderWithMantine(<ControlledColumnOrderTable />);
      await user.click(screen.getByText('hide age'));
      expect(headerText()).toEqual(['First Name', 'Last Name', 'City']);
      expect(screen.getByTestId('visible-columns')).toHaveTextContent(
        'firstName,lastName,city',
      );
    });

    it('applies a column order set through the table API', async () => {
      const { user } = renderWithMantine(<UncontrolledColumnOrderTable />);
      await user.click(screen.getByText('reverse order'));
      expect(headerText()).toEqual(['City', 'Age', 'Last Name', 'First Name']);
      expect(screen.getByTestId('column-order')).toHaveTextContent(
        'city,age,lastName,firstName',
      );
      await user.click(screen.getByText('hide age'));
      expect(headerText()).toEqual(['City', 'Last Name', 'First Name']);
      await user.click(screen.getByText('reset order'));
      expect(headerText()).toEqual(['First Name', 'Last Name', 'City']);
    });

    it('reorders through the column actions menu and reports it', async () => {
      const { user } = renderWithMantine(<ControlledColumnOrderTable />);
      await user.click(
        screen.getAllByRole('button', { name: 'Column Actions' })[0],
      );
      await user.click(await screen.findByText('Hide First Name column'));
      await waitFor(() =>
        expect(headerText()).toEqual(['Last Name', 'Age', 'City']),
      );
      expect(screen.getByTestId('visible-columns')).toHaveTextContent(
        'lastName,age,city',
      );
    });

    it('hides columns from a stand-alone MRT_ShowHideColumnsButton', async () => {
      const { user } = renderWithMantine(<ShowHideColumnsHarness />);
      await user.click(
        screen.getByRole('button', { name: 'Show/Hide columns' }),
      );
      const menu = await screen.findByRole('menu');
      const ageSwitch = within(menu).getByRole('switch', { name: /Age/ });
      expect(ageSwitch).toBeChecked();
      await user.click(ageSwitch);
      expect(screen.getByTestId('hidden-columns')).toHaveTextContent(
        '{"age":false}',
      );
      await waitFor(() =>
        expect(
          within(screen.getByRole('menu')).getByRole('switch', { name: /Age/ }),
        ).not.toBeChecked(),
      );
    });
  });

  describe('row model read during render', () => {
    it('follows sorting, filtering, paging, selection and grouping', async () => {
      const { user } = renderWithMantine(<RowModelReaderTable />);
      expect(screen.getByTestId('queue')).toHaveTextContent('p1,p2,p3,p4,p5');
      expect(screen.getByTestId('page-ids')).toHaveTextContent('p1,p2,p3');

      await user.click(screen.getByText('sort age desc'));
      expect(screen.getByTestId('queue')).toHaveTextContent('p4,p2,p5,p1,p3');
      expect(screen.getByTestId('page-ids')).toHaveTextContent('p4,p2,p5');

      await user.click(screen.getByText('next page'));
      expect(screen.getByTestId('page-ids')).toHaveTextContent('p1,p3');

      expect(screen.getByTestId('all-on-page-selected')).toHaveTextContent(
        'false',
      );
      await user.click(screen.getByText('select page'));
      expect(screen.getByTestId('all-on-page-selected')).toHaveTextContent(
        'true',
      );

      await user.click(screen.getByText('group by city'));
      expect(screen.getByTestId('grouping')).toHaveTextContent('city');
    });

    it('follows a global filter set through the table API', async () => {
      const { user } = renderWithMantine(<RowModelReaderTable />);
      await user.click(screen.getByText('filter o'));
      await waitFor(() =>
        expect(screen.getByTestId('queue')).not.toHaveTextContent(
          'p1,p2,p3,p4,p5',
        ),
      );
      expect(bodyRows().length).toBeLessThan(5);
    });
  });

  describe('destructured table methods', () => {
    it('reads current state through a destructured getState', async () => {
      const { user } = renderWithMantine(<DestructuredTable />);
      expect(screen.getByTestId('density')).toHaveTextContent('md');
      await user.click(screen.getByText('set density xl'));
      expect(screen.getByTestId('density')).toHaveTextContent('xl');
      await user.click(screen.getAllByRole('checkbox')[2]);
      expect(screen.getByTestId('selection')).toHaveTextContent('{"p2":true}');
    });
  });

  describe('row editing', () => {
    it('opens, saves and closes a row editor', async () => {
      const { user } = renderWithMantine(<EditingTable />);
      await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
      expect(screen.getByTestId('editing-row')).toHaveTextContent('p1');

      const cityInput = screen.getByDisplayValue('Omaha');
      await user.clear(cityInput);
      await user.type(cityInput, 'Lincoln');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(screen.getByTestId('editing-row')).toHaveTextContent('none'),
      );
      expect(screen.getByTestId('cities')).toHaveTextContent(
        'Lincoln,Boise,Tulsa,Akron,Reno',
      );
      expect(screen.getByText('Lincoln')).toBeInTheDocument();
    });

    it('cancels a row editor without saving', async () => {
      const { user } = renderWithMantine(<EditingTable />);
      await user.click(screen.getAllByRole('button', { name: 'Edit' })[1]);
      expect(screen.getByTestId('editing-row')).toHaveTextContent('p2');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByTestId('editing-row')).toHaveTextContent('none');
      expect(screen.getByTestId('cities')).toHaveTextContent(
        'Omaha,Boise,Tulsa,Akron,Reno',
      );
    });
  });

  describe('row virtualization', () => {
    const original = {
      height: Object.getOwnPropertyDescriptor(
        Element.prototype,
        'clientHeight',
      ),
      width: Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth'),
    };

    beforeEach(() => {
      //jsdom has no layout, so give every element a size the virtualizer can use
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        bottom: 40,
        height: 40,
        left: 0,
        right: 800,
        toJSON: () => ({}),
        top: 0,
        width: 800,
        x: 0,
        y: 0,
      });
      Object.defineProperty(Element.prototype, 'clientHeight', {
        configurable: true,
        get: () => 400,
      });
      Object.defineProperty(Element.prototype, 'clientWidth', {
        configurable: true,
        get: () => 800,
      });
    });

    afterEach(() => {
      if (original.height)
        Object.defineProperty(
          Element.prototype,
          'clientHeight',
          original.height,
        );
      if (original.width)
        Object.defineProperty(Element.prototype, 'clientWidth', original.width);
    });

    it('renders a window of rows and re-sorts it', async () => {
      const { user } = renderWithMantine(<VirtualizedTable />);
      await waitFor(() => expect(bodyRows().length).toBeGreaterThan(0));
      expect(bodyRows().length).toBeLessThan(200);
      expect(columnText()[0]).toBe('First0');

      await user.click(screen.getByText('sort age desc'));
      expect(screen.getByTestId('sorting')).toHaveTextContent('age');
      await waitFor(() => expect(columnText()[0]).toBe('First49'));
    });
  });

  describe('table reference', () => {
    it('keeps its identity across unrelated renders and changes it with table state', async () => {
      const onTable = vi.fn<(table: MRT_TableInstance<Person>) => void>();
      const { user } = renderWithMantine(
        <TableEffectCounter onTable={onTable} />,
      );
      await waitFor(() => expect(onTable).toHaveBeenCalled());
      const settledCalls = onTable.mock.calls.length;
      const firstTable = onTable.mock.lastCall![0];

      await user.click(screen.getByText('unrelated update'));
      await user.click(screen.getByText('unrelated update'));
      expect(screen.getByTestId('unrelated')).toHaveTextContent('2');
      if (__MRT_REACT_COMPILER__ !== 'off') {
        //compiled consumer code passes stable options, so the reference is stable
        expect(onTable.mock.calls.length).toBe(settledCalls);
      }

      await user.click(screen.getAllByRole('checkbox')[1]);
      await waitFor(() =>
        expect(onTable.mock.calls.length).toBeGreaterThan(settledCalls),
      );
      const nextTable = onTable.mock.lastCall![0];
      expect(nextTable).not.toBe(firstTable);
      //an old reference still reads current state
      expect(firstTable.getState().rowSelection).toEqual({ p1: true });
      expect(nextTable.getState().rowSelection).toEqual({ p1: true });
      expect(firstTable.getSelectedRowModel().rows).toHaveLength(1);
    });
  });
});

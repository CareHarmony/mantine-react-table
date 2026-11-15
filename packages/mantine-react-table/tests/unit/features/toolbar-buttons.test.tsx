import { useState } from 'react';

import { columns, people, type Person } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import {
  createMRTColumnHelper,
  MantineReactTable,
  type MRT_TableOptions,
  useMantineReactTable,
} from '@careharmony/mantine-react-table-ng';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const getRowId = (row: Person) => row.id;

//prints the table state next to the table, like a consumer that reads `table.getState()`
const StateTable = (options: Partial<MRT_TableOptions<Person>>) => {
  const table = useMantineReactTable({
    columns,
    data: people,
    getRowId,
    ...options,
  });
  const { isFullScreen, rowPinning } = table.getState();
  return (
    <>
      <output data-testid="state">
        {JSON.stringify({ isFullScreen, rowPinning })}
      </output>
      <MantineReactTable table={table} />
    </>
  );
};

const state = () => JSON.parse(screen.getByTestId('state').textContent ?? '{}');

const ControlledFullScreenTable = ({
  onChange,
}: {
  onChange: (isFullScreen: boolean) => void;
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  return (
    <MantineReactTable
      columns={columns}
      data={people}
      onIsFullScreenChange={(updater) => {
        const next =
          typeof updater === 'function' ? updater(isFullScreen) : updater;
        onChange(next);
        setIsFullScreen(next);
      }}
      state={{ isFullScreen }}
    />
  );
};

const names = people.map((person) => person.firstName);

//the first name of each rendered body row, whatever display columns come first
const rowNames = (root: ParentNode = document) =>
  Array.from(root.querySelectorAll('tbody tr')).map((row) =>
    Array.from(row.querySelectorAll('td'))
      .map((cell) => cell.textContent ?? '')
      .find((text) => names.includes(text)),
  );

const tbodies = () => Array.from(document.querySelectorAll('tbody'));

const tbodyNames = () =>
  tbodies().map((tbody) =>
    Array.from(tbody.querySelectorAll('tr')).map((row) =>
      Array.from(row.querySelectorAll('td'))
        .map((cell) => cell.textContent ?? '')
        .find((text) => names.includes(text)),
    ),
  );

const rowOf = (firstName: string) => {
  const row = screen.getByText(firstName).closest('tr');
  if (!row) throw new Error(`no row for ${firstName}`);
  return row;
};

const pinButtonsOf = (firstName: string) =>
  within(rowOf(firstName)).getAllByRole('button', { name: 'Pin' });

describe(`toolbar and row buttons [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  describe('full screen button', () => {
    const paper = () => document.querySelector('.mrt-table-paper');

    it('toggles full screen on and off', async () => {
      const { user } = renderWithMantine(<StateTable />);
      expect(state().isFullScreen).toBe(false);
      expect(paper()).not.toHaveClass('mrt-table-paper-fullscreen');

      await user.click(
        screen.getByRole('button', { name: 'Toggle full screen' }),
      );
      await waitFor(() => expect(state().isFullScreen).toBe(true));
      expect(paper()).toHaveClass('mrt-table-paper-fullscreen');
      expect(paper()).toHaveStyle({ zIndex: '200' });

      await user.click(
        screen.getByRole('button', { name: 'Toggle full screen' }),
      );
      await waitFor(() => expect(state().isFullScreen).toBe(false));
      expect(paper()).not.toHaveClass('mrt-table-paper-fullscreen');
    });

    it('reports each toggle through onIsFullScreenChange', async () => {
      const onChange = vi.fn<(isFullScreen: boolean) => void>();
      const { user } = renderWithMantine(
        <ControlledFullScreenTable onChange={onChange} />,
      );
      await user.click(
        screen.getByRole('button', { name: 'Toggle full screen' }),
      );
      await waitFor(() =>
        expect(paper()).toHaveClass('mrt-table-paper-fullscreen'),
      );
      await user.click(
        screen.getByRole('button', { name: 'Toggle full screen' }),
      );
      await waitFor(() =>
        expect(paper()).not.toHaveClass('mrt-table-paper-fullscreen'),
      );
      expect(onChange.mock.calls).toEqual([[true], [false]]);
    });

    it('shows its tooltip on hover and closes it on click', async () => {
      const { user } = renderWithMantine(<StateTable />);
      const toggle = screen.getByRole('button', { name: 'Toggle full screen' });
      expect(screen.queryByRole('tooltip')).toBeNull();

      await user.hover(toggle);
      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        'Toggle full screen',
      );

      await user.click(toggle);
      await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
      expect(state().isFullScreen).toBe(true);
    });

    it('closes its tooltip when the pointer leaves', async () => {
      const { user } = renderWithMantine(<StateTable />);
      const toggle = screen.getByRole('button', { name: 'Toggle full screen' });
      await user.hover(toggle);
      expect(await screen.findByRole('tooltip')).toBeInTheDocument();
      await user.unhover(toggle);
      await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
      expect(state().isFullScreen).toBe(false);
    });

    it('is absent with enableFullScreenToggle off', () => {
      renderWithMantine(<StateTable enableFullScreenToggle={false} />);
      expect(
        screen.queryByRole('button', { name: 'Toggle full screen' }),
      ).toBeNull();
    });
  });

  describe('row pin button', () => {
    it('pins rows to a top body and unpins them', async () => {
      const { user } = renderWithMantine(
        <StateTable enableRowPinning rowPinningDisplayMode="top" />,
      );
      expect(tbodies()).toHaveLength(1);
      expect(rowNames()).toEqual(['Ada', 'Ben', 'Cy', 'Dee', 'Eli']);
      expect(pinButtonsOf('Cy')).toHaveLength(1);

      await user.click(pinButtonsOf('Cy')[0]);
      await waitFor(() => expect(tbodies()).toHaveLength(2));
      expect(tbodyNames()).toEqual([['Cy'], ['Ada', 'Ben', 'Dee', 'Eli']]);
      expect(state().rowPinning).toEqual({ bottom: [], top: ['p3'] });
      expect(rowOf('Cy')).toHaveAttribute('data-row-pinned');

      await user.click(pinButtonsOf('Eli')[0]);
      await waitFor(() =>
        expect(tbodyNames()).toEqual([
          ['Cy', 'Eli'],
          ['Ada', 'Ben', 'Dee'],
        ]),
      );
      expect(state().rowPinning.top).toEqual(['p3', 'p5']);

      await user.click(pinButtonsOf('Cy')[0]);
      await waitFor(() =>
        expect(tbodyNames()).toEqual([['Eli'], ['Ada', 'Ben', 'Cy', 'Dee']]),
      );
      await user.click(pinButtonsOf('Eli')[0]);
      await waitFor(() => expect(tbodies()).toHaveLength(1));
      expect(rowNames()).toEqual(['Ada', 'Ben', 'Cy', 'Dee', 'Eli']);
      expect(state().rowPinning).toEqual({ bottom: [], top: [] });
    });

    it('pins rows to a bottom body and unpins them', async () => {
      const { user } = renderWithMantine(
        <StateTable enableRowPinning rowPinningDisplayMode="bottom" />,
      );
      await user.click(pinButtonsOf('Ben')[0]);
      await waitFor(() => expect(tbodies()).toHaveLength(2));
      expect(tbodyNames()).toEqual([['Ada', 'Cy', 'Dee', 'Eli'], ['Ben']]);
      expect(state().rowPinning).toEqual({ bottom: ['p2'], top: [] });
      expect(rowOf('Ben')).toHaveAttribute('data-row-pinned');

      await user.click(pinButtonsOf('Ben')[0]);
      await waitFor(() => expect(tbodies()).toHaveLength(1));
      expect(rowNames()).toEqual(['Ada', 'Ben', 'Cy', 'Dee', 'Eli']);
      expect(state().rowPinning).toEqual({ bottom: [], top: [] });
    });

    it('offers a top and a bottom button in the top-and-bottom mode', async () => {
      const { user } = renderWithMantine(
        <StateTable enableRowPinning rowPinningDisplayMode="top-and-bottom" />,
      );
      expect(pinButtonsOf('Dee')).toHaveLength(2);

      await user.click(pinButtonsOf('Dee')[0]);
      await waitFor(() => expect(tbodies()).toHaveLength(2));
      await user.click(pinButtonsOf('Ada')[1]);
      await waitFor(() => expect(tbodies()).toHaveLength(3));

      expect(tbodyNames()).toEqual([['Dee'], ['Ben', 'Cy', 'Eli'], ['Ada']]);
      expect(state().rowPinning).toEqual({ bottom: ['p1'], top: ['p4'] });
      //a pinned row has a single unpin button
      expect(pinButtonsOf('Dee')).toHaveLength(1);
      expect(pinButtonsOf('Ben')).toHaveLength(2);
    });

    it('keeps one body and marks the row in the sticky mode', async () => {
      const { user } = renderWithMantine(<StateTable enableRowPinning />);
      await user.click(pinButtonsOf('Cy')[0]);
      await waitFor(() =>
        expect(state().rowPinning).toEqual({ bottom: [], top: ['p3'] }),
      );
      expect(tbodies()).toHaveLength(1);
      expect(rowNames()).toHaveLength(5);
      expect(rowOf('Cy')).toHaveAttribute('data-row-pinned');
      expect(rowOf('Ada')).not.toHaveAttribute('data-row-pinned');
    });

    it('renders a pin button only for rows that enableRowPinning allows', () => {
      renderWithMantine(
        <StateTable
          enableRowPinning={(row) => row.original.age > 40}
          rowPinningDisplayMode="top"
        />,
      );
      expect(screen.getAllByRole('button', { name: 'Pin' })).toHaveLength(2);
      expect(pinButtonsOf('Ben')).toHaveLength(1);
      expect(within(rowOf('Ada')).queryByRole('button', { name: 'Pin' })).toBe(
        null,
      );
    });

    it('labels its tooltip Pin, then Unpin for a pinned row', async () => {
      const { user } = renderWithMantine(
        <StateTable enableRowPinning rowPinningDisplayMode="top" />,
      );
      expect(screen.queryByRole('tooltip')).toBeNull();
      await user.hover(pinButtonsOf('Cy')[0]);
      expect(await screen.findByRole('tooltip')).toHaveTextContent(/^Pin$/);
      await user.unhover(pinButtonsOf('Cy')[0]);
      await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());

      await user.click(pinButtonsOf('Cy')[0]);
      await waitFor(() => expect(tbodies()).toHaveLength(2));
      //the click closes the tooltip that the hover before the click opened
      await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
      await user.unhover(pinButtonsOf('Cy')[0]);
      await user.hover(pinButtonsOf('Cy')[0]);
      expect(await screen.findByRole('tooltip')).toHaveTextContent(/^Unpin$/);
    });

    it('does not select or click the row when pinning', async () => {
      const onRowClick = vi.fn();
      const { user } = renderWithMantine(
        <StateTable
          enableRowPinning
          mantineTableBodyRowProps={{ onClick: onRowClick }}
          rowPinningDisplayMode="top"
        />,
      );
      await user.click(pinButtonsOf('Cy')[0]);
      await waitFor(() => expect(tbodies()).toHaveLength(2));
      expect(onRowClick).not.toHaveBeenCalled();
    });
  });

  describe('createMRTColumnHelper', () => {
    const helper = createMRTColumnHelper<Person>();

    it('builds an accessorKey column from a key', () => {
      expect(helper.accessor('firstName', { header: 'First Name' })).toEqual({
        accessorKey: 'firstName',
        header: 'First Name',
      });
    });

    it('builds an accessorFn column from a function', () => {
      const fullName = (row: Person) => `${row.firstName} ${row.lastName}`;
      const column = helper.accessor(fullName, {
        header: 'Full Name',
        id: 'fullName',
      });
      expect(column).toEqual({
        accessorFn: fullName,
        header: 'Full Name',
        id: 'fullName',
      });
      expect(column).not.toHaveProperty('accessorKey');
    });

    it('returns display and group columns unchanged', () => {
      const display = { header: 'Actions', id: 'actions' };
      expect(helper.display(display)).toBe(display);
      const group = {
        columns: [helper.accessor('age', { header: 'Age' })],
        header: 'Details',
        id: 'details',
      };
      expect(helper.group(group)).toBe(group);
    });

    it('renders a table from helper columns', () => {
      const helperColumns = [
        helper.accessor((row) => `${row.firstName} ${row.lastName}`, {
          header: 'Full Name',
          id: 'fullName',
        }),
        helper.group({
          columns: [
            helper.accessor('age', { header: 'Age' }),
            helper.accessor('city', {
              Cell: ({ cell }) => cell.getValue().toUpperCase(),
              header: 'City',
            }),
          ],
          header: 'Details',
          id: 'details',
        }),
        helper.display({
          Cell: ({ row }) => `#${row.original.id}`,
          header: 'Ref',
          id: 'ref',
        }),
      ];
      renderWithMantine(
        <MantineReactTable columns={helperColumns} data={people} />,
      );
      expect(
        screen
          .getAllByRole('columnheader')
          .map((header) => header.textContent?.trim())
          .filter(Boolean),
      ).toEqual(['Details', 'Full Name', 'Age', 'City', 'Ref']);
      const firstRow = screen
        .getAllByRole('row')
        .filter((row) => row.closest('tbody'))[0];
      expect(
        within(firstRow)
          .getAllByRole('cell')
          .map((cell) => cell.textContent),
      ).toEqual(['Ada Young', '31', 'OMAHA', '#p1']);
    });
  });
});

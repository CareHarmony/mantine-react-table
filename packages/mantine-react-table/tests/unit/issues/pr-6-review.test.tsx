import { useEffect, useState } from 'react';

import { MantineProvider } from '@mantine/core';

/**
 * Regression tests for the defects found in the review of pull request 6.
 */
import { columns, manyPeople, people, type Person } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';
import { mockElementSizes } from './virtualization';

import {
  MantineReactTable,
  type MRT_ColumnDef,
  MRT_FilterFns,
  type MRT_TableInstance,
  useMantineReactTable,
} from '@careharmony/mantine-react-table-ng';
import { act, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const fiftyPeople = manyPeople(50);

const settle = (ms = 150) =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

const bodyRows = () => Array.from(document.querySelectorAll('tbody tr'));

describe(`pull request 6 review [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  describe('1: virtualizer scroll element', () => {
    it.each([
      ['enabled: false', { enabled: false }],
      [
        'a custom getScrollElement',
        { getScrollElement: () => document.body as unknown as HTMLDivElement },
      ],
    ])('stops re-rendering with %s', async (_name, virtualizerOptions) => {
      mockElementSizes();
      const rowVirtualizerOptions = vi.fn(() => virtualizerOptions);
      renderWithMantine(
        <MantineReactTable
          columns={columns}
          data={fiftyPeople}
          enablePagination={false}
          enableRowVirtualization
          rowVirtualizerOptions={rowVirtualizerOptions}
        />,
      );
      await settle(400);
      const renders = rowVirtualizerOptions.mock.calls.length;
      await settle();
      //the options function runs once per render of the table body
      expect(rowVirtualizerOptions.mock.calls.length).toBe(renders);
      expect(renders).toBeLessThan(20);
    });
  });

  describe('2: table reference', () => {
    it('keeps the reference when a setter is called with the current value', async () => {
      const effect = vi.fn();
      const Table = () => {
        const table = useMantineReactTable({ columns, data: people });
        useEffect(() => {
          effect();
          table.setSorting([{ desc: false, id: 'firstName' }]);
          table.setPageIndex(0);
        }, [table]);
        return <MantineReactTable table={table} />;
      };
      renderWithMantine(<Table />);
      await settle();
      const runs = effect.mock.calls.length;
      await settle();
      expect(effect.mock.calls.length).toBe(runs);
      expect(runs).toBeLessThan(5);
    });

    it('keeps the reference when an option object has the same content', async () => {
      const tables = new Set<MRT_TableInstance<Person>>();
      const Table = () => {
        const [count, setCount] = useState(0);
        const table = useMantineReactTable({
          columns,
          data: people,
          mantineTableProps: { striped: true },
        });
        tables.add(table);
        return (
          <>
            <button onClick={() => setCount(count + 1)}>Render {count}</button>
            <MantineReactTable table={table} />
          </>
        );
      };
      const { user } = renderWithMantine(<Table />);
      await settle();
      const before = tables.size;
      await user.click(screen.getByRole('button', { name: /^Render/ }));
      await user.click(screen.getByRole('button', { name: /^Render/ }));
      expect(tables.size).toBe(before);
    });

    it('keeps memoized rows when an inline function option changes identity', async () => {
      const Cell = vi.fn(() => 'cell');
      const cellColumns: MRT_ColumnDef<Person>[] = [
        { accessorKey: 'firstName', Cell, header: 'First Name' },
      ];
      const Table = () => {
        const [count, setCount] = useState(0);
        const table = useMantineReactTable({
          columns: cellColumns,
          data: people,
          mantineTableBodyRowProps: () => ({ title: 'row' }),
          memoMode: 'rows',
        });
        return (
          <>
            <button onClick={() => setCount(count + 1)}>Render {count}</button>
            <MantineReactTable table={table} />
          </>
        );
      };
      const { user } = renderWithMantine(<Table />);
      await settle();
      const before = Cell.mock.calls.length;
      await user.click(screen.getByRole('button', { name: /^Render/ }));
      expect(Cell.mock.calls.length).toBe(before);

      //a state change still reaches the memoized rows
      await user.click(
        screen.getByRole('button', { name: 'Toggle density' }),
      );
      expect(Cell.mock.calls.length).toBeGreaterThan(before);
    });
  });

  describe('3: virtual row measurement', () => {
    it('observes rows whose height already equals the estimate', async () => {
      mockElementSizes({ itemHeight: 50 });
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
        height: 50,
      } as DOMRect);
      const observe = vi.spyOn(window.ResizeObserver.prototype, 'observe');
      renderWithMantine(
        <MantineReactTable
          columns={columns}
          data={fiftyPeople}
          enablePagination={false}
          enableRowVirtualization
          rowVirtualizerOptions={{ estimateSize: () => 50 }}
        />,
      );
      await waitFor(() => expect(bodyRows().length).toBeGreaterThan(5));
      const observed = new Set(observe.mock.calls.map(([element]) => element));
      expect(bodyRows().every((row) => observed.has(row))).toBe(true);
    });
  });

  describe('4: scroll area viewport ref', () => {
    it('finds the viewport with a custom class prefix and clears it on unmount', async () => {
      let table!: MRT_TableInstance<Person>;
      const userViewportRef = vi.fn();
      const Table = ({ withScrollArea }: { withScrollArea: boolean }) => {
        table = useMantineReactTable({
          columns,
          data: people,
          mantineScrollAreaProps: { viewportRef: userViewportRef },
          withScrollArea,
        });
        return <MantineReactTable table={table} />;
      };
      const ui = (withScrollArea: boolean) => (
        <MantineProvider classNamesPrefix="app" env="test">
          <Table withScrollArea={withScrollArea} />
        </MantineProvider>
      );
      const { rerender } = render(ui(true));
      await settle();
      const viewport = table.refs.scrollAreaViewportRef.current;
      expect(viewport).toBeInstanceOf(HTMLElement);
      expect(viewport).toContainElement(document.querySelector('table'));
      expect(userViewportRef).toHaveBeenLastCalledWith(viewport);

      rerender(ui(false));
      await settle();
      expect(table.refs.scrollAreaViewportRef.current).toBeNull();
      expect(userViewportRef).toHaveBeenLastCalledWith(null);
    });
  });

  describe('5: table container styles', () => {
    it('does not select a Mantine ScrollArea by its class name', () => {
      const css = readFileSync(
        join(
          process.cwd(),
          'src/components/table/MRT_TableContainer.module.css',
        ),
        'utf8',
      );
      expect(css).not.toContain('mantine-ScrollArea');
      expect(css).not.toContain(':has(');
    });

    it('marks the container only when withScrollArea is set', () => {
      const { unmount } = renderWithMantine(
        <MantineReactTable columns={columns} data={people} withScrollArea />,
      );
      expect(
        document.querySelector('.mrt-table-container > .mrt-table-scroll-area'),
      ).toBeInTheDocument();
      unmount();
      renderWithMantine(<MantineReactTable columns={columns} data={people} />);
      expect(
        document.querySelector('.mrt-table-scroll-area'),
      ).not.toBeInTheDocument();
    });
  });

  describe('6: saving an edited row', () => {
    it('keeps a number when the input text is another form of that number', async () => {
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
      //a formatted display value: the row cache still holds the number 31
      screen.getByPlaceholderText<HTMLInputElement>('Age').value = '31.0';
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(onEditingRowSave.mock.calls[0][0].values.age).toBe(31);
    });
  });

  describe('7: date filters', () => {
    type FilterRow = Parameters<typeof MRT_FilterFns.equals>[0];
    const row = (value: unknown) =>
      ({ getValue: () => value }) as unknown as FilterRow;
    const morning = row(new Date(2026, 2, 10, 9, 30));
    const { between, betweenInclusive, equals, greaterThan, lessThan } =
      MRT_FilterFns;

    it('compares a Date cell with the picked day and not with its midnight', () => {
      expect(equals(morning, 'c', '2026-03-10')).toBe(true);
      expect(greaterThan(morning, 'c', '2026-03-10')).toBe(false);
      expect(lessThan(morning, 'c', '2026-03-10')).toBe(false);
      expect(greaterThan(morning, 'c', '2026-03-09')).toBe(true);
      expect(lessThan(morning, 'c', '2026-03-11')).toBe(true);
    });

    it('treats both ends of a date range the same way', () => {
      expect(between(morning, 'c', ['2026-03-10', '2026-03-12'])).toBe(false);
      expect(between(morning, 'c', ['2026-03-08', '2026-03-10'])).toBe(false);
      expect(between(morning, 'c', ['2026-03-09', '2026-03-11'])).toBe(true);
      expect(
        betweenInclusive(morning, 'c', ['2026-03-10', '2026-03-12']),
      ).toBe(true);
      expect(
        betweenInclusive(morning, 'c', ['2026-03-08', '2026-03-10']),
      ).toBe(true);
    });
  });

  describe('8: toolbar height', () => {
    it('follows a toolbar that changes height in the same render', async () => {
      //the toolbar grows with the number of selected rows, as an alert banner would
      const checkedRows = () =>
        document.querySelectorAll('tbody input:checked').length;
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
        function (this: HTMLElement) {
          return this.classList.contains('mrt-bottom-toolbar')
            ? 50 + 10 * checkedRows()
            : 50;
        },
      );
      const toolbarHeight = () =>
        document
          .querySelector<HTMLElement>('.mrt-table-container')
          ?.style.getPropertyValue('--mrt-top-toolbar-height');
      const { user } = renderWithMantine(
        <MantineReactTable
          columns={columns}
          data={people}
          enableRowSelection
          enableTopToolbar={false}
        />,
      );
      await settle();
      expect(toolbarHeight()).toBe('50');

      await user.click(document.querySelector('tbody input[type="checkbox"]')!);
      expect(checkedRows()).toBe(1);
      expect(toolbarHeight()).toBe('60');
    });
  });
});

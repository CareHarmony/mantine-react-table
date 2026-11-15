/**
 * Column pinning positions cells with CSS. Vitest does not load the CSS and
 * jsdom has no layout, so these tests read the stylesheet source and the
 * offsets that the cells publish as CSS variables.
 */
import { DirectionProvider, MantineProvider } from '@mantine/core';

import { columns, people } from '../fixtures/data';

import { MantineReactTable } from '@careharmony/mantine-react-table-ng';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pinnedCellStylesheets = [
  'components/head/MRT_TableHeadCell.module.css',
  'components/body/MRT_TableBodyRow.module.css',
  'components/footer/MRT_TableFooterCell.module.css',
];

const readStylesheet = (path: string) =>
  readFileSync(resolve(__dirname, '../../../src', path), 'utf8');

describe('issues 526 and 480: column pinning in RTL', () => {
  it.each(pinnedCellStylesheets)(
    'offsets pinned cells with logical properties in %s',
    (path) => {
      const css = readStylesheet(path);
      expect(css).toContain(
        'inset-inline-start: calc(var(--mrt-table-cell-left, 0) * 1px);',
      );
      expect(css).toContain(
        'inset-inline-end: calc(var(--mrt-table-cell-right, 0) * 1px);',
      );
      //physical offsets pin a column to the wrong side when the row runs right to left
      expect(css).not.toMatch(/\sleft: calc\(var\(--mrt-table-cell-left/);
      expect(css).not.toMatch(/\sright: calc\(var\(--mrt-table-cell-right/);
      //the shadow on the inner edge of a pinned column is mirrored
      expect(css.match(/@mixin rtl/g)).toHaveLength(2);
    },
  );

  it('publishes start and end offsets for pinned cells in RTL', () => {
    render(
      <DirectionProvider initialDirection="rtl">
        <MantineProvider>
          <MantineReactTable
            columns={columns}
            data={people}
            enableColumnPinning
            initialState={{
              columnPinning: {
                left: ['firstName', 'lastName'],
                right: ['city'],
              },
            }}
          />
        </MantineProvider>
      </DirectionProvider>,
    );
    const lastName = screen.getByText('Young').closest('td') as HTMLElement;
    expect(lastName).toHaveAttribute('data-column-pinned', 'left');
    expect(lastName.style.getPropertyValue('--mrt-table-cell-left')).toBe(
      '180',
    );
    const city = screen.getByText('Omaha').closest('td') as HTMLElement;
    expect(city).toHaveAttribute('data-column-pinned', 'right');
    expect(city.style.getPropertyValue('--mrt-table-cell-right')).toBe('0');
  });
});

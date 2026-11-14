import { columns, people } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import { screen } from '@testing-library/react';
import { MantineReactTable } from 'mantine-react-table-ng';
import { describe, expect, it } from 'vitest';

describe('issue 554: globalFilterModeOptions', () => {
  it('lists every mode passed in globalFilterModeOptions', async () => {
    const { user } = renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={people}
        enableGlobalFilterModes
        globalFilterFn="contains"
        globalFilterModeOptions={['contains', 'startsWith', 'equals']}
        initialState={{ showGlobalFilter: true }}
      />,
    );
    await user.click(screen.getByLabelText('Change search mode'));
    const items = await screen.findAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual([
      '*Contains',
      'aStarts With',
      '=Equals',
    ]);
  });

  it('keeps fuzzy, contains and startsWith as the default modes', async () => {
    const { user } = renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={people}
        enableGlobalFilterModes
        initialState={{ showGlobalFilter: true }}
      />,
    );
    await user.click(screen.getByLabelText('Change search mode'));
    const items = await screen.findAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual([
      '≈Fuzzy',
      '*Contains',
      'aStarts With',
    ]);
  });
});

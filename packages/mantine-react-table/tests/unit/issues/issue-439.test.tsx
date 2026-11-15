import { renderWithMantine } from '../fixtures/render';

import {
  MantineReactTable,
  type MRT_ColumnDef,
} from '@careharmony/mantine-react-table-ng';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

type Place = { city: null | string; name: string; zip: null | number };

const places: Place[] = [
  { city: null, name: 'Ada', zip: null },
  { city: 'Boise', name: 'Ben', zip: 83702 },
  { city: 'Tulsa', name: 'Cy', zip: 74103 },
  { city: 'Huntington', name: 'Dee', zip: 25701 },
];

const placeColumns: MRT_ColumnDef<Place>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'city', header: 'City' },
  { accessorKey: 'zip', header: 'Zip' },
];

const bodyText = () =>
  Array.from(document.querySelectorAll('tbody tr')).map((tr) => tr.textContent);

describe('issue 439: global filter and a null value in the first row', () => {
  it.each(['fuzzy', 'contains'])(
    'searches a column whose first row is null (%s)',
    async (globalFilterFn) => {
      const { user } = renderWithMantine(
        <MantineReactTable
          columns={placeColumns}
          data={places}
          enableFilterMatchHighlighting={false}
          globalFilterFn={globalFilterFn}
          initialState={{ showGlobalFilter: true }}
        />,
      );
      await user.type(screen.getByPlaceholderText('Search'), 'Hunt');
      await waitFor(() => expect(bodyText()).toEqual(['DeeHuntington25701']));
    },
  );

  it('searches a number column whose first row is null', async () => {
    const { user } = renderWithMantine(
      <MantineReactTable
        columns={placeColumns}
        data={places}
        enableFilterMatchHighlighting={false}
        globalFilterFn="contains"
        initialState={{ showGlobalFilter: true }}
      />,
    );
    await user.type(screen.getByPlaceholderText('Search'), '741');
    await waitFor(() => expect(bodyText()).toEqual(['CyTulsa74103']));
  });

  it('honors a getColumnCanGlobalFilter passed by the consumer', async () => {
    const { user } = renderWithMantine(
      <MantineReactTable
        columns={placeColumns}
        data={places}
        enableFilterMatchHighlighting={false}
        getColumnCanGlobalFilter={(column) => column.id === 'name'}
        globalFilterFn="contains"
        initialState={{ showGlobalFilter: true }}
      />,
    );
    await user.type(screen.getByPlaceholderText('Search'), 'Hunt');
    await waitFor(() =>
      expect(screen.getByText('No results found')).toBeInTheDocument(),
    );
  });
});

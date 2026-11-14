/**
 * Both issues are type errors. Vitest strips types, so the runtime assertions
 * pass with or without the fix. The typed option objects below fail `tsc` when
 * the types regress (tests are outside the package tsconfig, see the report).
 */
import { columns, people, type Person } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import { screen } from '@testing-library/react';
import {
  MantineReactTable,
  type MRT_TableOptions,
} from 'mantine-react-table-ng';
import { describe, expect, it } from 'vitest';

type Options = MRT_TableOptions<Person>;

const searchProps: Options['mantineSearchTextInputProps'] = {
  'data-autofocus': true,
  'data-testid': 'search-input',
  placeholder: 'Find a person',
};

const bodyRowProps: Options['mantineTableBodyRowProps'] = {
  'data-testid': 'body-row',
};

const createModalProps: Options['mantineCreateRowModalProps'] = {
  'data-testid': 'create-modal',
  title: <strong>Create a person</strong>,
};

const editModalProps: Options['mantineEditRowModalProps'] = ({ row }) => ({
  title: <em>Edit {row.original.firstName}</em>,
});

describe('issue 273: data attributes in mantine props', () => {
  it('passes data-autofocus to the search input', () => {
    renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={people}
        initialState={{ showGlobalFilter: true }}
        mantineSearchTextInputProps={searchProps}
        mantineTableBodyRowProps={bodyRowProps}
      />,
    );
    expect(screen.getByTestId('search-input')).toHaveAttribute(
      'data-autofocus',
      'true',
    );
    expect(screen.getAllByTestId('body-row')).toHaveLength(5);
  });
});

describe('issue 158: ReactNode modal titles', () => {
  it('renders an element as the edit modal title', async () => {
    const { user } = renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={people}
        enableEditing
        mantineCreateRowModalProps={createModalProps}
        mantineEditRowModalProps={editModalProps}
      />,
    );
    await user.click(screen.getAllByLabelText('Edit')[0]);
    expect(await screen.findByText('Edit Ada')).toBeInTheDocument();
  });
});

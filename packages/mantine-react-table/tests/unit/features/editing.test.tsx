import { createRef, useState } from 'react';

import { columns, people, type Person } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_TableOptions,
} from 'mantine-react-table-ng';
import { describe, expect, it, vi } from 'vitest';

type Options = Partial<MRT_TableOptions<Person>>;

const EditTable = (props: Options) => (
  <MantineReactTable
    columns={columns}
    data={people}
    enableEditing
    getRowId={(row) => row.id}
    renderTopToolbarCustomActions={({ table }) => (
      <button onClick={() => table.setCreatingRow(true)} type="button">
        new row
      </button>
    )}
    {...props}
  />
);

const editButton = (index: number) =>
  screen.getAllByRole('button', { name: 'Edit' })[index];

const retype = async (
  user: ReturnType<typeof renderWithMantine>['user'],
  input: HTMLElement,
  text: string,
) => {
  await user.clear(input);
  await user.type(input, text);
};

describe(`editing [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  describe('editDisplayMode row', () => {
    it('passes the edited values to onEditingRowSave and exits through exitEditingMode', async () => {
      const onEditingRowSave = vi.fn();
      const { user } = renderWithMantine(
        <EditTable editDisplayMode="row" onEditingRowSave={onEditingRowSave} />,
      );
      await user.click(editButton(0));
      const input = screen.getByPlaceholderText('First Name');
      expect(input).toHaveValue('Ada');
      expect(screen.getByPlaceholderText('Age')).toHaveValue('31');
      await retype(user, input, 'Zed');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(onEditingRowSave).toHaveBeenCalledTimes(1);
      const arg = onEditingRowSave.mock.calls[0][0];
      expect(arg.row.id).toBe('p1');
      expect(arg.values).toMatchObject({
        age: 31,
        city: 'Omaha',
        firstName: 'Zed',
        lastName: 'Young',
      });
      //the row stays in edit mode until the consumer calls exitEditingMode
      expect(screen.getByPlaceholderText('First Name')).toBeInTheDocument();
      act(() => arg.exitEditingMode());
      expect(screen.queryByPlaceholderText('First Name')).toBeNull();
    });

    it('saves the value on Enter and keeps it for the save callback', async () => {
      const onEditingRowSave = vi.fn();
      const { user } = renderWithMantine(
        <EditTable editDisplayMode="row" onEditingRowSave={onEditingRowSave} />,
      );
      await user.click(editButton(1));
      const input = screen.getByPlaceholderText('City');
      await retype(user, input, 'Provo{Enter}');
      expect(input).not.toHaveFocus();
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(onEditingRowSave.mock.calls[0][0].values).toMatchObject({
        city: 'Provo',
        firstName: 'Ben',
      });
    });

    it('calls onEditingRowCancel and leaves edit mode on cancel', async () => {
      const onEditingRowCancel = vi.fn();
      const onEditingRowSave = vi.fn();
      const { user } = renderWithMantine(
        <EditTable
          editDisplayMode="row"
          onEditingRowCancel={onEditingRowCancel}
          onEditingRowSave={onEditingRowSave}
        />,
      );
      await user.click(editButton(2));
      await retype(user, screen.getByPlaceholderText('First Name'), 'Zed');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onEditingRowCancel).toHaveBeenCalledTimes(1);
      expect(onEditingRowCancel.mock.calls[0][0].row.id).toBe('p3');
      expect(onEditingRowSave).not.toHaveBeenCalled();
      expect(screen.queryByPlaceholderText('First Name')).toBeNull();
      expect(screen.getByText('Cy')).toBeInTheDocument();

      //the discarded value does not come back on the next edit
      await user.click(editButton(2));
      expect(screen.getByPlaceholderText('First Name')).toHaveValue('Cy');
    });
  });

  describe('editDisplayMode cell', () => {
    const CellEditTable = ({ onBlur }: { onBlur: (id: string) => void }) => {
      const [data, setData] = useState(people);
      return (
        <EditTable
          data={data}
          editDisplayMode="cell"
          mantineEditTextInputProps={({ cell, row }) => ({
            onBlur: (event) => {
              onBlur(cell.id);
              setData((prev) =>
                prev.map((person) =>
                  person.id === row.id
                    ? { ...person, [cell.column.id]: event.target.value }
                    : person,
                ),
              );
            },
          })}
        />
      );
    };

    it('opens an input on double click and saves on Enter', async () => {
      const onBlur = vi.fn();
      const { user } = renderWithMantine(<CellEditTable onBlur={onBlur} />);
      await user.dblClick(screen.getByText('Ada'));
      const input = screen.getByPlaceholderText('First Name');
      //the cell focuses its input 100 ms after the double click
      await waitFor(() => expect(input).toHaveFocus());
      await retype(user, input, 'Zed{Enter}');

      await waitFor(() =>
        expect(screen.queryByPlaceholderText('First Name')).toBeNull(),
      );
      expect(onBlur).toHaveBeenCalledTimes(1);
      expect(onBlur).toHaveBeenCalledWith('p1_firstName');
      expect(screen.getByText('Zed')).toBeInTheDocument();
      expect(screen.queryByText('Ada')).toBeNull();
    });

    it('saves on blur when another element is clicked', async () => {
      const onBlur = vi.fn();
      const { user } = renderWithMantine(<CellEditTable onBlur={onBlur} />);
      await user.dblClick(screen.getByText('Boise'));
      const input = screen.getByPlaceholderText('City');
      await waitFor(() => expect(input).toHaveFocus());
      await retype(user, input, 'Provo');
      await user.click(screen.getByText('new row'));

      await waitFor(() =>
        expect(screen.queryByPlaceholderText('City')).toBeNull(),
      );
      expect(onBlur).toHaveBeenCalledWith('p2_city');
      expect(screen.getByText('Provo')).toBeInTheDocument();
    });

    it('does not close the editor on Enter during an IME composition', async () => {
      const onBlur = vi.fn();
      const { user } = renderWithMantine(<CellEditTable onBlur={onBlur} />);
      await user.dblClick(screen.getByText('Ada'));
      const input = screen.getByPlaceholderText('First Name');
      await waitFor(() => expect(input).toHaveFocus());
      fireEvent.keyDown(input, { isComposing: true, key: 'Enter' });
      expect(input).toHaveFocus();
      expect(onBlur).not.toHaveBeenCalled();
    });
  });

  describe('editDisplayMode table', () => {
    it('renders every cell as an input and reports the value on blur and on Enter', async () => {
      const onBlur = vi.fn();
      const { user } = renderWithMantine(
        <EditTable
          editDisplayMode="table"
          mantineEditTextInputProps={({ cell }) => ({
            onBlur: (event) => onBlur(cell.id, event.target.value),
          })}
        />,
      );
      expect(screen.getAllByPlaceholderText('First Name')).toHaveLength(5);
      expect(screen.getAllByRole('textbox')).toHaveLength(20);

      const first = screen.getAllByPlaceholderText('First Name')[0];
      await retype(user, first, 'Zed');
      await user.click(screen.getAllByPlaceholderText('City')[3]);
      expect(onBlur).toHaveBeenLastCalledWith('p1_firstName', 'Zed');
      expect(first).toHaveValue('Zed');

      await user.keyboard('X{Enter}');
      expect(onBlur).toHaveBeenLastCalledWith('p4_city', 'AkronX');
      expect(screen.getAllByPlaceholderText('City')[3]).not.toHaveFocus();
    });

    it('disables the inputs of a column with enableEditing false', () => {
      const lockedColumns: MRT_ColumnDef<Person>[] = columns.map((column) =>
        column.accessorKey === 'age'
          ? { ...column, enableEditing: false }
          : column,
      );
      renderWithMantine(
        <EditTable columns={lockedColumns} editDisplayMode="table" />,
      );
      //a column with enableEditing false keeps its plain cell value
      expect(screen.queryAllByPlaceholderText('Age')).toHaveLength(0);
      expect(screen.getAllByRole('textbox')).toHaveLength(15);
      expect(screen.getByText('31')).toBeInTheDocument();
    });
  });

  describe('editDisplayMode modal', () => {
    it('saves the modal form values and closes through exitEditingMode', async () => {
      const onEditingRowSave = vi.fn();
      const { user } = renderWithMantine(
        <EditTable onEditingRowSave={onEditingRowSave} />,
      );
      await user.click(editButton(3));
      const dialog = await screen.findByRole('dialog');
      const input = within(dialog).getByLabelText('Last Name');
      expect(input).toHaveValue('Vance');
      await retype(user, input, 'Stone');
      await user.click(within(dialog).getByRole('button', { name: 'Save' }));

      expect(onEditingRowSave).toHaveBeenCalledTimes(1);
      const arg = onEditingRowSave.mock.calls[0][0];
      expect(arg.row.id).toBe('p4');
      expect(arg.values).toMatchObject({
        age: 52,
        city: 'Akron',
        firstName: 'Dee',
        lastName: 'Stone',
      });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      act(() => arg.exitEditingMode());
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('cancels from the Cancel button', async () => {
      const onEditingRowCancel = vi.fn();
      const { user } = renderWithMantine(
        <EditTable onEditingRowCancel={onEditingRowCancel} />,
      );
      await user.click(editButton(0));
      const dialog = await screen.findByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      expect(onEditingRowCancel).toHaveBeenCalledTimes(1);
      expect(onEditingRowCancel.mock.calls[0][0].row.id).toBe('p1');
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('cancels and calls the modal onClose prop on Escape', async () => {
      const onEditingRowCancel = vi.fn();
      const onClose = vi.fn();
      const { user } = renderWithMantine(
        <EditTable
          mantineEditRowModalProps={{ onClose }}
          onEditingRowCancel={onEditingRowCancel}
        />,
      );
      await user.click(editButton(1));
      const dialog = await screen.findByRole('dialog');
      await retype(user, within(dialog).getByLabelText('City'), 'Provo');
      await user.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(onEditingRowCancel).toHaveBeenCalledTimes(1);
      expect(onEditingRowCancel.mock.calls[0][0].row.id).toBe('p2');
      expect(onClose).toHaveBeenCalledTimes(1);

      //the discarded value does not come back on the next edit
      await user.click(editButton(1));
      expect(
        within(await screen.findByRole('dialog')).getByLabelText('City'),
      ).toHaveValue('Boise');
    });

    it('prevents the native submit of the modal form', async () => {
      const onEditingRowSave = vi.fn();
      const { user } = renderWithMantine(
        <EditTable onEditingRowSave={onEditingRowSave} />,
      );
      await user.click(editButton(0));
      const dialog = await screen.findByRole('dialog');
      const form = dialog.querySelector('form') as HTMLFormElement;
      //fireEvent returns false when the handler called preventDefault
      expect(fireEvent.submit(form)).toBe(false);
      expect(onEditingRowSave).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('creating rows', () => {
    it('passes the new values to onCreatingRowSave in createDisplayMode row', async () => {
      const onCreatingRowSave = vi.fn();
      const { user } = renderWithMantine(
        <EditTable
          createDisplayMode="row"
          editDisplayMode="row"
          onCreatingRowSave={onCreatingRowSave}
        />,
      );
      await user.click(screen.getByText('new row'));
      const input = screen.getByPlaceholderText('First Name');
      expect(input).toHaveValue('');
      await user.type(input, 'Fay');
      await user.type(screen.getByPlaceholderText('City'), 'Provo');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(onCreatingRowSave).toHaveBeenCalledTimes(1);
      const arg = onCreatingRowSave.mock.calls[0][0];
      expect(arg.row.id).toBe('mrt-row-create');
      expect(arg.values).toMatchObject({
        age: '',
        city: 'Provo',
        firstName: 'Fay',
        lastName: '',
      });
      expect(screen.getByPlaceholderText('First Name')).toBeInTheDocument();
      act(() => arg.exitCreatingMode());
      expect(screen.queryByPlaceholderText('First Name')).toBeNull();
    });

    it('calls onCreatingRowCancel and removes the row in createDisplayMode row', async () => {
      const onCreatingRowCancel = vi.fn();
      const onEditingRowCancel = vi.fn();
      const { user } = renderWithMantine(
        <EditTable
          createDisplayMode="row"
          editDisplayMode="row"
          onCreatingRowCancel={onCreatingRowCancel}
          onEditingRowCancel={onEditingRowCancel}
        />,
      );
      await user.click(screen.getByText('new row'));
      await user.type(screen.getByPlaceholderText('First Name'), 'Fay');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onCreatingRowCancel).toHaveBeenCalledTimes(1);
      expect(onCreatingRowCancel.mock.calls[0][0].row.id).toBe(
        'mrt-row-create',
      );
      expect(onEditingRowCancel).not.toHaveBeenCalled();
      expect(screen.queryByPlaceholderText('First Name')).toBeNull();
    });

    it('saves from the create modal and closes through exitCreatingMode', async () => {
      const onCreatingRowSave = vi.fn();
      const onEditingRowSave = vi.fn();
      const { user } = renderWithMantine(
        <EditTable
          onCreatingRowSave={onCreatingRowSave}
          onEditingRowSave={onEditingRowSave}
        />,
      );
      await user.click(screen.getByText('new row'));
      const dialog = await screen.findByRole('dialog');
      await user.type(within(dialog).getByLabelText('First Name'), 'Fay');
      await user.type(within(dialog).getByLabelText('Age'), '40');
      await user.click(within(dialog).getByRole('button', { name: 'Save' }));

      expect(onEditingRowSave).not.toHaveBeenCalled();
      expect(onCreatingRowSave).toHaveBeenCalledTimes(1);
      const arg = onCreatingRowSave.mock.calls[0][0];
      expect(arg.values).toMatchObject({
        age: '40',
        city: '',
        firstName: 'Fay',
        lastName: '',
      });
      act(() => arg.exitCreatingMode());
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('cancels the create modal from the Cancel button', async () => {
      const onCreatingRowCancel = vi.fn();
      const { user } = renderWithMantine(
        <EditTable onCreatingRowCancel={onCreatingRowCancel} />,
      );
      await user.click(screen.getByText('new row'));
      const dialog = await screen.findByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      expect(onCreatingRowCancel).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    });

    it('cancels the create modal and calls its onClose prop on Escape', async () => {
      const onCreatingRowCancel = vi.fn();
      const onEditingRowCancel = vi.fn();
      const onClose = vi.fn();
      const { user } = renderWithMantine(
        <EditTable
          mantineCreateRowModalProps={{ onClose }}
          onCreatingRowCancel={onCreatingRowCancel}
          onEditingRowCancel={onEditingRowCancel}
        />,
      );
      await user.click(screen.getByText('new row'));
      const dialog = await screen.findByRole('dialog');
      await user.click(within(dialog).getByLabelText('First Name'));
      await user.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(onCreatingRowCancel).toHaveBeenCalledTimes(1);
      expect(onCreatingRowCancel.mock.calls[0][0].row.id).toBe(
        'mrt-row-create',
      );
      expect(onEditingRowCancel).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('editVariant select', () => {
    const cities = ['Omaha', 'Boise', 'Tulsa', 'Akron', 'Reno'];

    const selectColumns = (
      selectProps: MRT_ColumnDef<Person>['mantineEditSelectProps'],
    ): MRT_ColumnDef<Person>[] =>
      columns.map((column) =>
        column.accessorKey === 'city'
          ? {
              ...column,
              editVariant: 'select',
              mantineEditSelectProps: selectProps,
            }
          : column,
      );

    it('calls onChange with the picked option and saves the value', async () => {
      const onChange = vi.fn();
      const onEditingRowSave = vi.fn();
      const { user } = renderWithMantine(
        <EditTable
          columns={selectColumns({ data: cities, onChange })}
          editDisplayMode="row"
          onEditingRowSave={onEditingRowSave}
        />,
      );
      await user.click(editButton(0));
      const input = screen.getByPlaceholderText('City');
      expect(input).toHaveValue('Omaha');
      await user.click(input);
      await user.click(await screen.findByRole('option', { name: 'Tulsa' }));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toBe('Tulsa');
      expect(onChange.mock.calls[0][1]).toMatchObject({ value: 'Tulsa' });
      expect(input).toHaveValue('Tulsa');

      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(onEditingRowSave.mock.calls[0][0].values).toMatchObject({
        city: 'Tulsa',
        firstName: 'Ada',
      });
    });

    it('forwards onClick and registers the input on the ref prop', async () => {
      const onClick = vi.fn();
      const onRowClick = vi.fn();
      const ref = createRef<HTMLInputElement>();
      const { user } = renderWithMantine(
        <EditTable
          columns={selectColumns({ data: cities, onClick, ref })}
          editDisplayMode="row"
          mantineTableBodyRowProps={{ onClick: onRowClick }}
        />,
      );
      await user.click(editButton(1));
      const input = screen.getByPlaceholderText('City');
      expect(ref.current).toBe(input);

      onRowClick.mockClear();
      await user.click(input);
      expect(onClick).toHaveBeenCalledTimes(1);
      //the select stops the click before it reaches the row
      expect(onRowClick).not.toHaveBeenCalled();
    });

    it('labels the select with the column header in the edit modal', async () => {
      const onEditingRowSave = vi.fn();
      const { user } = renderWithMantine(
        <EditTable
          columns={selectColumns({ data: cities })}
          onEditingRowSave={onEditingRowSave}
        />,
      );
      await user.click(editButton(4));
      const dialog = await screen.findByRole('dialog');
      const input = within(dialog).getByLabelText('City', {
        selector: 'input',
      });
      expect(input).toHaveValue('Reno');
      await user.click(input);
      await user.click(await screen.findByRole('option', { name: 'Akron' }));
      await user.click(within(dialog).getByRole('button', { name: 'Save' }));
      expect(onEditingRowSave.mock.calls[0][0].values).toMatchObject({
        city: 'Akron',
      });
    });
  });

  describe('editVariant multi-select', () => {
    type Tagged = { id: string; name: string; tags: string[] };

    const tagged: Tagged[] = [
      { id: 't1', name: 'One', tags: ['red'] },
      { id: 't2', name: 'Two', tags: ['green', 'blue'] },
    ];

    const TaggedTable = ({
      selectProps,
      ...props
    }: {
      selectProps?: MRT_ColumnDef<Tagged>['mantineEditSelectProps'];
    } & Partial<MRT_TableOptions<Tagged>>) => {
      const taggedColumns: MRT_ColumnDef<Tagged>[] = [
        { accessorKey: 'name', header: 'Name' },
        {
          accessorKey: 'tags',
          Cell: ({ row }) => row.original.tags.join('+'),
          editVariant: 'multi-select',
          header: 'Tags',
          mantineEditSelectProps: selectProps,
        },
      ];
      return (
        <MantineReactTable
          columns={taggedColumns}
          data={tagged}
          editDisplayMode="row"
          enableEditing
          getRowId={(row) => row.id}
          {...props}
        />
      );
    };

    const data = ['red', 'green', 'blue'];

    it('saves the added option with the row', async () => {
      const onEditingRowSave = vi.fn();
      const ref = createRef<HTMLInputElement>();
      const { user } = renderWithMantine(
        <TaggedTable
          onEditingRowSave={onEditingRowSave}
          selectProps={{ data, ref }}
        />,
      );
      await user.click(editButton(0));
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      await user.click(ref.current as HTMLInputElement);
      await user.click(await screen.findByRole('option', { name: 'blue' }));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(onEditingRowSave).toHaveBeenCalledTimes(1);
      expect(onEditingRowSave.mock.calls[0][0].values).toMatchObject({
        name: 'One',
        tags: ['red', 'blue'],
      });
    });

    it('saves a removed pill while the input is not focused', async () => {
      const onEditingRowSave = vi.fn();
      const { user } = renderWithMantine(
        <TaggedTable
          onEditingRowSave={onEditingRowSave}
          selectProps={{ data }}
        />,
      );
      await user.click(editButton(1));
      const removeButtons = document.querySelectorAll('.mantine-Pill-remove');
      expect(removeButtons).toHaveLength(2);
      fireEvent.click(removeButtons[0]);
      await waitFor(() =>
        expect(document.querySelectorAll('.mantine-Pill-remove')).toHaveLength(
          1,
        ),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(onEditingRowSave.mock.calls[0][0].values).toMatchObject({
        tags: ['blue'],
      });
    });

    it('forwards onClick and stops the click before it reaches the row', async () => {
      const onClick = vi.fn();
      const onRowClick = vi.fn();
      const ref = createRef<HTMLInputElement>();
      const { user } = renderWithMantine(
        <TaggedTable
          mantineTableBodyRowProps={{ onClick: onRowClick }}
          selectProps={{ data, onClick, ref }}
        />,
      );
      await user.click(editButton(0));
      onRowClick.mockClear();
      await user.click(ref.current as HTMLInputElement);
      expect(onClick).toHaveBeenCalled();
      expect(onRowClick).not.toHaveBeenCalled();
    });

    it('calls onChange with the new value', async () => {
      const onChange = vi.fn();
      const ref = createRef<HTMLInputElement>();
      const { user } = renderWithMantine(
        <TaggedTable selectProps={{ data, onChange, ref }} />,
      );
      await user.click(editButton(0));
      await user.click(ref.current as HTMLInputElement);
      await user.click(await screen.findByRole('option', { name: 'blue' }));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toEqual(['red', 'blue']);
    });
  });
});

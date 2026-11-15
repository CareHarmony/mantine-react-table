import '@mantine/core/styles.css';
import '@mantine/dates/styles.css'; //if using mantine date picker features
import '@careharmony/mantine-react-table-ng/styles.css'; //make sure MRT styles were imported in your app root (once)
import { useMemo, useState } from 'react';
import {
  MantineReactTable,
  type MRT_Cell,
  type MRT_ColumnDef,
} from '@careharmony/mantine-react-table-ng';
import { Text } from '@mantine/core';
import { data, type Person } from './makeData';

const Example = () => {
  const columns = useMemo<MRT_ColumnDef<Person>[]>(
    () => [
      {
        accessorKey: 'firstName',
        header: 'First Name',
      },
      {
        accessorKey: 'lastName',
        header: 'Last Name',
      },

      {
        accessorKey: 'address',
        header: 'Address',
      },
      {
        accessorKey: 'city',
        header: 'City',
      },
      {
        accessorKey: 'state',
        header: 'State',
      },
    ],
    [],
  );

  const [tableData, setTableData] = useState<Person[]>(() => data);

  const handleSaveCell = (cell: MRT_Cell<Person>, value: any) => {
    //send/receive api updates here
    //replace the edited row with a copy, React state must not be mutated
    setTableData((prev) =>
      prev.map((row, index) =>
        index === cell.row.index ? { ...row, [cell.column.id]: value } : row,
      ),
    );
  };

  return (
    <MantineReactTable
      columns={columns}
      data={tableData}
      editDisplayMode="cell"
      enableEditing
      mantineEditTextInputProps={({ cell }) => ({
        //onBlur is more efficient, but could use onChange instead
        onBlur: (event) => {
          handleSaveCell(cell, event.target.value);
        },
      })}
      renderBottomToolbarCustomActions={() => (
        <Text style={{ fontStyle: 'italic', padding: '0 16px' }}>
          Double-Click a Cell to Edit
        </Text>
      )}
    />
  );
};

export default Example;

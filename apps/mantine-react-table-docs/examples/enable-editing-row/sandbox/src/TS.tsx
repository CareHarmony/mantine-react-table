import '@mantine/core/styles.css';
import '@mantine/dates/styles.css'; //if using mantine date picker features
import 'mantine-react-table-ng/styles.css'; //make sure MRT styles were imported in your app root (once)
import { useMemo, useState } from 'react';
import {
  MantineReactTable,
  type MRT_TableOptions,
  type MRT_ColumnDef,
} from 'mantine-react-table-ng';
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

  const handleSaveRow: MRT_TableOptions<Person>['onEditingRowSave'] = async ({
    table,
    row,
    values,
  }) => {
    //send/receive api updates here
    //replace the edited row, React state must not be mutated
    setTableData((prev) =>
      prev.map((person, index) => (index === row.index ? values : person)),
    );
    table.setEditingRow(null); //exit editing mode
  };

  return (
    <MantineReactTable
      columns={columns}
      data={tableData}
      editDisplayMode="row"
      enableEditing
      onEditingRowSave={handleSaveRow}
    />
  );
};

export default Example;

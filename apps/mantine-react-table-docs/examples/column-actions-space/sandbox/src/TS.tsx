import '@mantine/core/styles.css';
import '@mantine/dates/styles.css'; //if using mantine date picker features
import '@careharmony/mantine-react-table-ng/styles.css'; //make sure MRT styles were imported in your app root (once)
import { useMemo } from 'react';
import { MantineReactTable, type MRT_ColumnDef } from '@careharmony/mantine-react-table-ng';
import classes from './CSS.module.css';
import { data } from './makeData';

const Example = () => {
  const columns = useMemo<MRT_ColumnDef<(typeof data)[0]>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
      },
      {
        accessorKey: 'firstName',
        header: 'First Name',
      },
      {
        accessorKey: 'lastName',
        header: 'Last Name',
      },
    ],
    [],
  );

  return (
    <MantineReactTable
      columns={columns}
      data={data}
      mantineTableHeadCellProps={{ className: classes.headCell }}
    />
  );
};

export default Example;

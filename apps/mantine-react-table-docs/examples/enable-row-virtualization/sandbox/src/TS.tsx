import '@mantine/core/styles.css';
import '@mantine/dates/styles.css'; //if using mantine date picker features
import 'mantine-react-table-ng/styles.css'; //make sure MRT styles were imported in your app root (once)
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_SortingState,
  type MRT_RowVirtualizer,
} from 'mantine-react-table-ng';
import { makeData, type Person } from './makeData';

const Example = () => {
  const columns = useMemo<MRT_ColumnDef<Person>[]>(
    () => [
      {
        accessorKey: 'firstName',
        header: 'First Name',
        size: 150,
      },
      {
        accessorKey: 'middleName',
        header: 'Middle Name',
        size: 150,
      },
      {
        accessorKey: 'lastName',
        header: 'Last Name',
        size: 150,
      },
      {
        accessorKey: 'email',
        header: 'Email Address',
        size: 300,
      },
      {
        accessorKey: 'address',
        header: 'Address',
      },
      {
        accessorKey: 'zipCode',
        header: 'Zip Code',
      },
      {
        accessorKey: 'city',
        header: 'City',
      },
      {
        accessorKey: 'state',
        header: 'State',
      },
      {
        accessorKey: 'country',
        header: 'Country',
      },
    ],
    [],
  );

  //optionally access the underlying virtualizer instance
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  //create the 10,000 rows once, when the component mounts
  const [data] = useState<Person[]>(() => makeData(10_000));
  const [sorting, setSorting] = useState<MRT_SortingState>([]);

  useEffect(() => {
    try {
      //scroll to the top of the table when the sorting changes
      rowVirtualizerInstanceRef.current?.scrollToIndex(0);
    } catch (e) {
      console.log(e);
    }
  }, [sorting]);

  const table = useMantineReactTable({
    columns,
    data, //10,000 rows
    enableBottomToolbar: false,
    enableGlobalFilterModes: true,
    enablePagination: false,
    enableRowNumbers: true,
    enableRowVirtualization: true,
    mantineTableContainerProps: { style: { maxHeight: '600px' } },
    onSortingChange: setSorting,
    state: { sorting },
    rowVirtualizerOptions: { overscan: 8 }, //optionally customize the virtualizer
  });

  return <MantineReactTable table={table} />;
};

export default Example;

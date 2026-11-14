import '@mantine/core/styles.css';
import '@mantine/dates/styles.css'; //if using mantine date picker features
import 'mantine-react-table-ng/styles.css'; //make sure MRT styles were imported in your app root (once)
import { useEffect, useState } from 'react';
import { Button } from '@mantine/core';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_ColumnFiltersState,
  type MRT_DensityState,
  type MRT_SortingState,
  type MRT_VisibilityState,
} from 'mantine-react-table-ng';
import { data, type Person } from './makeData';

const columns: MRT_ColumnDef<Person>[] = [
  {
    accessorKey: 'firstName',
    header: 'First Name',
  },
  {
    accessorKey: 'lastName',
    header: 'Last Name',
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
    accessorKey: 'salary',
    header: 'Salary',
  },
];

//reads the saved value when the component mounts, then saves every change
const useSessionState = <T,>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(() => {
    const saved = sessionStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : initialValue;
  });

  useEffect(() => {
    //the table clears the global filter by setting it to undefined, which JSON cannot store
    if (value === undefined) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
};

const Example = () => {
  const [columnFilters, setColumnFilters] =
    useSessionState<MRT_ColumnFiltersState>('mrt_columnFilters_table_1', []);
  const [columnVisibility, setColumnVisibility] =
    useSessionState<MRT_VisibilityState>('mrt_columnVisibility_table_1', {});
  const [density, setDensity] = useSessionState<MRT_DensityState>(
    'mrt_density_table_1',
    'md',
  );
  const [globalFilter, setGlobalFilter] = useSessionState<string | undefined>(
    'mrt_globalFilter_table_1',
    undefined,
  );
  const [showGlobalFilter, setShowGlobalFilter] = useSessionState(
    'mrt_showGlobalFilter_table_1',
    false,
  );
  const [showColumnFilters, setShowColumnFilters] = useSessionState(
    'mrt_showColumnFilters_table_1',
    false,
  );
  const [sorting, setSorting] = useSessionState<MRT_SortingState>(
    'mrt_sorting_table_1',
    [],
  );

  const resetState = () => {
    sessionStorage.removeItem('mrt_columnFilters_table_1');
    sessionStorage.removeItem('mrt_columnVisibility_table_1');
    sessionStorage.removeItem('mrt_density_table_1');
    sessionStorage.removeItem('mrt_globalFilter_table_1');
    sessionStorage.removeItem('mrt_showGlobalFilter_table_1');
    sessionStorage.removeItem('mrt_showColumnFilters_table_1');
    sessionStorage.removeItem('mrt_sorting_table_1');
    window.location.reload();
  };

  const table = useMantineReactTable({
    columns,
    data,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onDensityChange: setDensity,
    onGlobalFilterChange: setGlobalFilter,
    onShowColumnFiltersChange: setShowColumnFilters,
    onShowGlobalFilterChange: setShowGlobalFilter,
    onSortingChange: setSorting,
    state: {
      columnFilters,
      columnVisibility,
      density,
      globalFilter,
      showColumnFilters,
      showGlobalFilter,
      sorting,
    },
    renderTopToolbarCustomActions: () => (
      <Button onClick={resetState}>Reset State</Button>
    ),
  });

  return <MantineReactTable table={table} />;
};

export default Example;

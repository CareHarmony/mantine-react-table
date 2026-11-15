import '@mantine/core/styles.css';
import '@mantine/dates/styles.css'; //if using mantine date picker features
import '@careharmony/mantine-react-table-ng/styles.css'; //make sure MRT styles were imported in your app root (once)
//Import Mantine React Table and its Types
import { MantineReactTable, type MRT_ColumnDef } from '@careharmony/mantine-react-table-ng';

//Import Mantine React Table Translations
import { MRT_Localization_CS } from '@careharmony/mantine-react-table-ng/locales/cs';

//mock data
import { data, type Person } from './makeData';

const columns: MRT_ColumnDef<Person>[] = [
  {
    accessorKey: 'firstName',
    header: 'Jméno',
  },
  {
    accessorKey: 'lastName',
    header: 'Příjmení',
    enableClickToCopy: true,
  },
  {
    accessorKey: 'age',
    header: 'Stáří',
  },
];

const Example = () => {
  return (
    <MantineReactTable
      columns={columns}
      data={data}
      enableColumnFilterModes
      enableColumnOrdering
      enableEditing
      enableColumnPinning
      enableRowActions
      enableRowSelection
      enableSelectAll={false}
      initialState={{ showColumnFilters: true, showGlobalFilter: true }}
      localization={MRT_Localization_CS}
    />
  );
};

export default Example;

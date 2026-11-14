'use no memo';

import { useMantineReactTable } from '../hooks/useMantineReactTable';
import {
  type MRT_RowData,
  type MRT_TableInstance,
  type MRT_TableOptions,
  type Xor,
} from '../types';
import { MRT_TablePaper } from './table/MRT_TablePaper';

type TableInstanceProp<TData extends MRT_RowData> = {
  table: MRT_TableInstance<TData>;
};

type Props<TData extends MRT_RowData> = Xor<
  TableInstanceProp<TData>,
  MRT_TableOptions<TData>
>;

const isTableInstanceProp = <TData extends MRT_RowData>(
  props: Props<TData>,
): props is TableInstanceProp<TData> =>
  (props as TableInstanceProp<TData>).table !== undefined;

const MRT_TableFromOptions = <TData extends MRT_RowData>(
  props: MRT_TableOptions<TData>,
) => <MRT_TablePaper table={useMantineReactTable(props)} />;

//two components keep the hook call unconditional (Rules of Hooks)
export const MantineReactTable = <TData extends MRT_RowData>(
  props: Props<TData>,
) =>
  isTableInstanceProp(props) ? (
    <MRT_TablePaper table={props.table} />
  ) : (
    <MRT_TableFromOptions {...(props as MRT_TableOptions<TData>)} />
  );

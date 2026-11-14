'use no memo';

import { useReducer } from 'react';

import {
  type MRT_RowData,
  type MRT_TableInstance,
  type MRT_TableOptions,
} from '../types';
import { useMRT_TableInstance } from './useMRT_TableInstance';
import { useMRT_TableOptions } from './useMRT_TableOptions';
import { useMRT_TableSnapshot } from './useMRT_TableSnapshot';

export const useMantineReactTable = <TData extends MRT_RowData>(
  tableOptions: MRT_TableOptions<TData>,
): MRT_TableInstance<TData> => {
  const [version, rerender] = useReducer((v: number) => v + 1, 0);
  const table = useMRT_TableInstance(
    useMRT_TableOptions(tableOptions),
    rerender,
  );
  return useMRT_TableSnapshot(table, tableOptions, version);
};

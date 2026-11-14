import {
  type RankingInfo,
  rankings,
  rankItem,
} from '@tanstack/match-sorter-utils';
import { filterFns, type Row } from '@tanstack/react-table';

import {
  type MRT_FilterOption,
  type MRT_Localization,
  type MRT_RowData,
} from '../types';

//the multi-select filter input clears itself to an empty array, which must remove the filter like '' does
const isBlankFilterValue = (val: any) =>
  !val || (Array.isArray(val) && !val.length);

/**
 * Mantine 8+ date inputs emit 'YYYY-MM-DD' strings. When the cell value is a
 * Date, the filter value is read as a Date at local midnight, so the two
 * compare as dates and not as text.
 */
const getDateFilterValue = (cellValue: unknown, filterValue: unknown) => {
  if (!(cellValue instanceof Date)) return undefined;
  if (filterValue instanceof Date) return filterValue;
  if (typeof filterValue !== 'string' || !filterValue) return undefined;
  const date = new Date(
    filterValue.includes('T') ? filterValue : `${filterValue}T00:00:00`,
  );
  return isNaN(+date) ? undefined : date;
};

const fuzzy = <TData extends MRT_RowData>(
  row: Row<TData>,
  columnId: string,
  filterValue: number | string,
  addMeta: (item: RankingInfo) => void,
) => {
  const itemRank = rankItem(row.getValue(columnId), filterValue as string, {
    threshold: rankings.MATCHES,
  });
  addMeta(itemRank);
  return itemRank.passed;
};

fuzzy.autoRemove = isBlankFilterValue;

const contains = <TData extends MRT_RowData>(
  row: Row<TData>,
  id: string,
  filterValue: number | string,
) =>
  row
    .getValue<number | string>(id)
    ?.toString()
    .toLowerCase()
    .trim()
    .includes(filterValue.toString().toLowerCase().trim());

contains.autoRemove = isBlankFilterValue;

const startsWith = <TData extends MRT_RowData>(
  row: Row<TData>,
  id: string,
  filterValue: number | string,
) =>
  row
    .getValue<number | string>(id)
    ?.toString()
    .toLowerCase()
    .trim()
    .startsWith(filterValue.toString().toLowerCase().trim());

startsWith.autoRemove = isBlankFilterValue;

const endsWith = <TData extends MRT_RowData>(
  row: Row<TData>,
  id: string,
  filterValue: number | string,
) =>
  row
    .getValue<number | string>(id)
    ?.toString()
    .toLowerCase()
    .trim()
    .endsWith(filterValue.toString().toLowerCase().trim());

endsWith.autoRemove = isBlankFilterValue;

const equals = <TData extends MRT_RowData>(
  row: Row<TData>,
  id: string,
  filterValue: number | string,
) => {
  const dateFilterValue = getDateFilterValue(row.getValue(id), filterValue);
  if (dateFilterValue) {
    //a date filter picks a day, so every time on that day matches
    return (
      row.getValue<Date>(id).toDateString() === dateFilterValue.toDateString()
    );
  }
  return (
    row.getValue<number | string>(id)?.toString().toLowerCase().trim() ===
    filterValue?.toString().toLowerCase().trim()
  );
};

equals.autoRemove = isBlankFilterValue;

const notEquals = <TData extends MRT_RowData>(
  row: Row<TData>,
  id: string,
  filterValue: number | string,
) => !equals(row, id, filterValue);

notEquals.autoRemove = isBlankFilterValue;

const greaterThan = <TData extends MRT_RowData>(
  row: Row<TData>,
  id: string,
  rawFilterValue: number | string,
) => {
  const filterValue =
    getDateFilterValue(row.getValue(id), rawFilterValue) ?? rawFilterValue;
  return !isNaN(+filterValue) && !isNaN(+row.getValue<number | string>(id))
    ? +row.getValue<number | string>(id) > +filterValue
    : row.getValue<number | string>(id)?.toString().toLowerCase().trim() >
        filterValue?.toString().toLowerCase().trim();
};

greaterThan.autoRemove = isBlankFilterValue;

const greaterThanOrEqualTo = <TData extends MRT_RowData>(
  row: Row<TData>,
  id: string,
  filterValue: number | string,
) => equals(row, id, filterValue) || greaterThan(row, id, filterValue);

greaterThanOrEqualTo.autoRemove = isBlankFilterValue;

const lessThan = <TData extends MRT_RowData>(
  row: Row<TData>,
  id: string,
  rawFilterValue: number | string,
) => {
  const filterValue =
    getDateFilterValue(row.getValue(id), rawFilterValue) ?? rawFilterValue;
  return !isNaN(+filterValue) && !isNaN(+row.getValue<number | string>(id))
    ? +row.getValue<number | string>(id) < +filterValue
    : row.getValue<number | string>(id)?.toString().toLowerCase().trim() <
        filterValue?.toString().toLowerCase().trim();
};

lessThan.autoRemove = isBlankFilterValue;

const lessThanOrEqualTo = <TData extends MRT_RowData>(
  row: Row<TData>,
  id: string,
  filterValue: number | string,
) => equals(row, id, filterValue) || lessThan(row, id, filterValue);

lessThanOrEqualTo.autoRemove = isBlankFilterValue;

const between = <TData extends MRT_RowData>(
  row: Row<TData>,
  id: string,
  filterValues: [number | string, number | string],
) =>
  ((['', undefined] as any[]).includes(filterValues[0]) ||
    greaterThan(row, id, filterValues[0])) &&
  ((!isNaN(+filterValues[0]) &&
    !isNaN(+filterValues[1]) &&
    +filterValues[0] > +filterValues[1]) ||
    (['', undefined] as any[]).includes(filterValues[1]) ||
    lessThan(row, id, filterValues[1]));

between.autoRemove = isBlankFilterValue;

const betweenInclusive = <TData extends MRT_RowData>(
  row: Row<TData>,
  id: string,
  filterValues: [number | string, number | string],
) =>
  ((['', undefined] as any[]).includes(filterValues[0]) ||
    greaterThanOrEqualTo(row, id, filterValues[0])) &&
  ((!isNaN(+filterValues[0]) &&
    !isNaN(+filterValues[1]) &&
    +filterValues[0] > +filterValues[1]) ||
    (['', undefined] as any[]).includes(filterValues[1]) ||
    lessThanOrEqualTo(row, id, filterValues[1]));

betweenInclusive.autoRemove = isBlankFilterValue;

const empty = <TData extends MRT_RowData>(
  row: Row<TData>,
  id: string,
  _filterValue: number | string,
) => !row.getValue<number | string>(id)?.toString().trim();

empty.autoRemove = isBlankFilterValue;

const notEmpty = <TData extends MRT_RowData>(
  row: Row<TData>,
  id: string,
  _filterValue: number | string,
) => !!row.getValue<number | string>(id)?.toString().trim();

notEmpty.autoRemove = isBlankFilterValue;

export const MRT_FilterFns = {
  ...filterFns,
  between,
  betweenInclusive,
  contains,
  empty,
  endsWith,
  equals,
  fuzzy,
  greaterThan,
  greaterThanOrEqualTo,
  lessThan,
  lessThanOrEqualTo,
  notEmpty,
  notEquals,
  startsWith,
};

export function localizedFilterOption(
  localization: MRT_Localization,
  option: MRT_FilterOption,
) {
  if (!option) {
    return '';
  }
  const key = `filter${option[0].toUpperCase()}${option.slice(1)}`;
  return localization[key as keyof MRT_Localization] ?? '';
}

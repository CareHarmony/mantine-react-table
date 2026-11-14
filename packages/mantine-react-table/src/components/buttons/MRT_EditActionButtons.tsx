'use no memo';

import clsx from 'clsx';

import classes from './MRT_EditActionButtons.module.css';

import { ActionIcon, Box, type BoxProps, Button, Tooltip } from '@mantine/core';

import {
  type MRT_Row,
  type MRT_RowData,
  type MRT_TableInstance,
} from '../../types';

interface Props<TData extends MRT_RowData> extends BoxProps {
  row: MRT_Row<TData>;
  table: MRT_TableInstance<TData>;
  variant?: 'icon' | 'text';
}

export const MRT_EditActionButtons = <TData extends MRT_RowData>({
  row,
  table,
  variant = 'icon',
  ...rest
}: Props<TData>) => {
  const {
    getState,
    options: {
      icons: { IconCircleX, IconDeviceFloppy },
      localization,
      onCreatingRowCancel,
      onCreatingRowSave,
      onEditingRowCancel,
      onEditingRowSave,
    },
    refs: { editInputRefs },
    setCreatingRow,
    setEditingRow,
  } = table;
  const { creatingRow, editingRow, isSaving } = getState();

  const isCreating = creatingRow?.id === row.id;
  const isEditing = editingRow?.id === row.id;

  const handleCancel = () => {
    if (isCreating) {
      onCreatingRowCancel?.({ row, table });
      setCreatingRow(null);
    } else if (isEditing) {
      onEditingRowCancel?.({ row, table });
      setEditingRow(null);
    }
    row._valuesCache = {} as any; //reset values cache
  };

  const handleSubmitRow = () => {
    //look for auto-filled input values. A browser can fill an input without
    //firing the change event that saves the value to the row cache.
    const inputNamePrefix = `${row.id}_`; //input names are cell ids: rowId_columnId
    const valuesCache = row._valuesCache as Record<string, unknown>;
    Object.values(editInputRefs?.current ?? {})
      .filter((input) => input?.name?.startsWith(inputNamePrefix))
      .forEach((input) => {
        const columnId = input.name.slice(inputNamePrefix.length);
        const editVariant = table.getColumn(columnId)?.columnDef.editVariant;
        //select inputs show the option label, not the value, so only text inputs are read
        const isTextInput = !editVariant || editVariant === 'text';
        if (
          isTextInput &&
          Object.hasOwn(valuesCache, columnId) &&
          input.value !== String(valuesCache[columnId] ?? '')
        ) {
          valuesCache[columnId] = input.value;
        }
      });
    if (isCreating)
      onCreatingRowSave?.({
        exitCreatingMode: () => setCreatingRow(null),
        row,
        table,
        values: row._valuesCache,
      });
    else if (isEditing) {
      onEditingRowSave?.({
        exitEditingMode: () => setEditingRow(null),
        row,
        table,
        values: row?._valuesCache,
      });
    }
  };

  return (
    <Box
      className={clsx('mrt-edit-action-buttons', classes.root)}
      onClick={(e) => e.stopPropagation()}
      {...rest}
    >
      {variant === 'icon' ? (
        <>
          <Tooltip label={localization.cancel} withinPortal>
            <ActionIcon
              aria-label={localization.cancel}
              color="red"
              onClick={handleCancel}
              variant="subtle"
            >
              <IconCircleX />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={localization.save} withinPortal>
            <ActionIcon
              aria-label={localization.save}
              color="blue"
              loading={isSaving}
              onClick={handleSubmitRow}
              variant="subtle"
            >
              <IconDeviceFloppy />
            </ActionIcon>
          </Tooltip>
        </>
      ) : (
        <>
          <Button onClick={handleCancel} variant="subtle">
            {localization.cancel}
          </Button>
          <Button loading={isSaving} onClick={handleSubmitRow} variant="filled">
            {localization.save}
          </Button>
        </>
      )}
    </Box>
  );
};

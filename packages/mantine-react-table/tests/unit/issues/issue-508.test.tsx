import { columns, people } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import {
  MantineReactTable,
  MRT_TablePagination,
  useMantineReactTable,
} from '@careharmony/mantine-react-table-ng';
import { describe, expect, it } from 'vitest';

const CustomToolbarTable = () => {
  const table = useMantineReactTable({
    columns,
    data: people,
    renderBottomToolbar: ({ table }) => (
      <MRT_TablePagination
        className="from-component-props"
        p={0}
        style={{ marginTop: 7 }}
        table={table}
      />
    ),
  });
  return <MantineReactTable table={table} />;
};

const paginationRoot = (container: HTMLElement) =>
  container.querySelector('.mrt-table-pagination') as HTMLElement;

describe('issue 508: MRT_TablePagination style props', () => {
  it('applies mantinePaginationProps style and className in the default mode', () => {
    const { container } = renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={people}
        mantinePaginationProps={{
          className: 'from-table-options',
          style: { padding: 0 },
        }}
      />,
    );
    const root = paginationRoot(container);
    expect(root).toHaveClass('from-table-options');
    expect(root.style.padding).toBe('0px');
  });

  it('applies style props passed to the component in the default mode', () => {
    const { container } = renderWithMantine(<CustomToolbarTable />);
    const root = paginationRoot(container);
    expect(root).toHaveClass('from-component-props');
    expect(root.style.marginTop).toBe('7px');
    expect(root.style.padding).not.toBe('');
  });

  it('keeps passing the props to the Mantine Pagination in the pages mode', () => {
    const { container } = renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={people}
        mantinePaginationProps={{ className: 'from-table-options' }}
        paginationDisplayMode="pages"
      />,
    );
    expect(paginationRoot(container)).not.toHaveClass('from-table-options');
    expect(container.querySelector('.mantine-Pagination-root')).toHaveClass(
      'from-table-options',
    );
  });
});

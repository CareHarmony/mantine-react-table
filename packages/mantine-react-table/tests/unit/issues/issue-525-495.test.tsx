import { columns, type Person } from '../fixtures/data';
import { renderWithMantine } from '../fixtures/render';

import { MantineReactTable } from '@careharmony/mantine-react-table-ng';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const noPeople: Person[] = [];

describe('issues 525 and 495: detail panel with no rows', () => {
  it('renders one empty row and no detail panel row', () => {
    const renderDetailPanel = vi.fn(() => <div>panel content</div>);
    const { container } = renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={noPeople}
        initialState={{ expanded: true }}
        mantineTableBodyRowProps={{ 'data-testid': 'body-row' }}
        renderDetailPanel={renderDetailPanel}
      />,
    );
    expect(screen.getByText('No records to display')).toBeInTheDocument();
    expect(screen.getAllByTestId('body-row')).toHaveLength(1);
    expect(
      container.querySelector('.mantine-Table-tr-detail-panel'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('panel content')).not.toBeInTheDocument();
    expect(renderDetailPanel).not.toHaveBeenCalled();
  });

  it('renders no expand button in the empty row', () => {
    const { container } = renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={noPeople}
        renderDetailPanel={() => <div>panel content</div>}
      />,
    );
    expect(container.querySelector('tbody button')).not.toBeInTheDocument();
  });

  it('does not crash when the panel reads nested row data', () => {
    renderWithMantine(
      <MantineReactTable
        columns={columns}
        data={noPeople}
        initialState={{ expanded: true }}
        renderDetailPanel={({ row }) => (
          <div>{row.original.firstName.toUpperCase()}</div>
        )}
      />,
    );
    expect(screen.getByText('No records to display')).toBeInTheDocument();
  });
});

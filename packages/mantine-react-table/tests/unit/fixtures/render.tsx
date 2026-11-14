import { type ReactElement } from 'react';

import { MantineProvider } from '@mantine/core';

import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

export const renderWithMantine = (ui: ReactElement) => ({
  user: userEvent.setup(),
  ...render(<MantineProvider>{ui}</MantineProvider>),
});

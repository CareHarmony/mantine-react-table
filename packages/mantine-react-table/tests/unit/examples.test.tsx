/// <reference types="vite/client" />
import { type ComponentType } from 'react';

import { renderWithMantine } from './fixtures/render';

import { waitFor } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

//the compiler memoized 98 of the 109 examples when this test was written
const MIN_COMPILED = 90;

/**
 * Renders every docs example (`apps/mantine-react-table-docs/examples`) as
 * consumer code. The examples are what users copy, so each one must render,
 * sort and select rows with the React Compiler on.
 */
const modules = import.meta.glob<{ default: ComponentType }>(
  '../../../../apps/mantine-react-table-docs/examples/*/sandbox/src/TS.tsx',
);

const examples = Object.entries(modules).map(
  ([path, load]) => [path.split('/examples/')[1].split('/')[0], load] as const,
);

//the compiled output reads its memo cache through `c(n)` from react/compiler-runtime
const memoCacheCall = /const \$ = \(0,\s*__vite_ssr_import_\d+__\.c\)\(\d+\)/;

//the remote examples call this API on mantine-react-table.com
const apiRows = Array.from({ length: 5 }, (_, index) => ({
  address: `${index} Main Street`,
  firstName: `First${index}`,
  lastName: `Last${index}`,
  phoneNumber: `555-000${index}`,
  state: 'Ohio',
}));

const layout = {
  height: Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight')!,
  width: Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')!,
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      json: async () => ({ data: apiRows, meta: { totalRowCount: 5 } }),
      ok: true,
    })),
  );
  //jsdom has no layout, so give every element a size the virtualizers can use.
  //The virtualizers measure cells with offsetWidth and offsetHeight, which must
  //agree with getBoundingClientRect or measuring never settles.
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(40);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(150);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    bottom: 40,
    height: 40,
    left: 0,
    right: 150,
    toJSON: () => ({}),
    top: 0,
    width: 150,
    x: 0,
    y: 0,
  });
  Object.defineProperty(Element.prototype, 'clientHeight', {
    configurable: true,
    get: () => 400,
  });
  Object.defineProperty(Element.prototype, 'clientWidth', {
    configurable: true,
    get: () => 800,
  });
});

afterEach(() => {
  Object.defineProperty(Element.prototype, 'clientHeight', layout.height);
  Object.defineProperty(Element.prototype, 'clientWidth', layout.width);
});

const renderExample = async (
  load: () => Promise<{ default: ComponentType }>,
) => {
  const { default: Example } = await load();
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const view = renderWithMantine(<Example />);
  const bodyRows = () =>
    view.container.querySelectorAll('tbody tr:not(.mrt-table-body-row-empty)');
  await waitFor(() => expect(bodyRows().length).toBeGreaterThan(0));
  return { ...view, bodyRows, errors, Example };
};

describe(`docs examples [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  it('finds the examples', () => {
    expect(examples.length).toBeGreaterThanOrEqual(109);
  });

  const compiled: string[] = [];

  afterAll(() => {
    //guards the harness: a compiler run must execute compiled examples
    if (__MRT_REACT_COMPILER__ !== 'off') {
      expect(compiled.length).toBeGreaterThanOrEqual(MIN_COMPILED);
    }
  });

  describe.each(examples)('%s', (name, load) => {
    it('renders rows without React errors', async () => {
      const { container, errors, Example } = await renderExample(load);
      expect(container.querySelector('table')).toBeInTheDocument();
      expect(errors.mock.calls).toEqual([]);
      //the compiler skips a few examples it cannot prove safe, so only `off` is exact
      if (__MRT_REACT_COMPILER__ === 'off') {
        expect(memoCacheCall.test(String(Example))).toBe(false);
      } else if (memoCacheCall.test(String(Example))) {
        compiled.push(name);
      }
    });

    it('sorts when a sort button is clicked', async ({ skip }) => {
      const { container, user } = await renderExample(load);
      const button = container.querySelector('.mrt-table-head-sort-button');
      if (!button) skip();
      await user.click(button!);
      await waitFor(() =>
        expect(
          container.querySelector('.mrt-table-head-sort-button[data-sorted]'),
        ).toBeInTheDocument(),
      );
    });

    it('selects a row when its checkbox is clicked', async ({ skip }) => {
      const { container, user } = await renderExample(load);
      const selector =
        'tbody .mrt-select-checkbox input, tbody input[aria-label="Toggle select row"]';
      const input = container.querySelector<HTMLInputElement>(selector);
      if (!input || input.disabled) skip();
      const before = input!.checked;
      await user.click(input!);
      await waitFor(() =>
        expect(
          container.querySelector<HTMLInputElement>(selector)!.checked,
        ).toBe(!before),
      );
    });
  });
});

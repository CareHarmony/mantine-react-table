import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * MRT_REACT_COMPILER
 *   off      - no React Compiler (default)
 *   consumer - compile only the test files, fixtures and docs examples, like
 *              an app that installs the package from node_modules
 *   all      - also compile the library code under test, like an app that
 *              transpiles the package (Next.js transpilePackages, monorepo aliases)
 * MRT_TEST_TARGET
 *   src  - import the library from ./src (default)
 *   dist - import the built bundle from ./dist (run `pnpm lib:build` first)
 */
const compilerMode = process.env.MRT_REACT_COMPILER ?? 'off';
const target = process.env.MRT_TEST_TARGET ?? 'src';

const toPosix = (path: string) => path.split('\\').join('/');
const root = toPosix(fileURLToPath(new URL('.', import.meta.url)));
const entry =
  target === 'dist' ? `${root}dist/index.esm.mjs` : `${root}src/index.ts`;

const locale =
  target === 'dist'
    ? `${root}locales/$1/index.esm.mjs`
    : `${root}src/locales/$1.ts`;

const styles =
  target === 'dist'
    ? `${root}styles.css`
    : `${root}tests/unit/fixtures/empty.css`;

//the docs examples are consumer code: tests/unit/examples.test.tsx renders all of them
const consumerCode = ['/tests/unit/', '/mantine-react-table-docs/examples/'];

const shouldCompile = (id: string) => {
  const file = toPosix(id);
  if (file.includes('/node_modules/')) return false;
  if (compilerMode === 'all') return true;
  if (compilerMode === 'consumer')
    return consumerCode.some((dir) => file.includes(dir));
  return false;
};

export default defineConfig({
  define: {
    __MRT_REACT_COMPILER__: JSON.stringify(compilerMode),
    __MRT_TEST_TARGET__: JSON.stringify(target),
  },
  plugins: [
    react({
      babel: (id) => ({
        plugins: shouldCompile(id)
          ? [['babel-plugin-react-compiler', { panicThreshold: 'none' }]]
          : [],
      }),
      include: /\.(mjs|[jt]sx?)$/,
    }),
  ],
  resolve: {
    alias: [
      { find: /^@careharmony\/mantine-react-table-ng$/, replacement: entry },
      {
        find: /^@careharmony\/mantine-react-table-ng\/locales\/([^/]+)$/,
        replacement: locale,
      },
      {
        find: /^@careharmony\/mantine-react-table-ng\/styles\.css$/,
        replacement: styles,
      },
    ],
    //the docs examples resolve packages from the docs app's node_modules
    dedupe: [
      '@mantine/core',
      '@mantine/dates',
      '@mantine/hooks',
      '@tabler/icons-react',
      'react',
      'react-dom',
    ],
  },
  test: {
    //`pnpm test:coverage` measures the library source with the compiler off
    coverage: {
      exclude: ['src/locales/**', 'src/**/*.d.ts', 'src/types.ts'],
      include: ['src/**/*.{ts,tsx}'],
      provider: 'v8',
      reporter: ['text-summary', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      //measured 97% lines, 91% branches, 95% functions when these were set
      thresholds: { branches: 85, functions: 90, lines: 93, statements: 93 },
    },
    css: { modules: { classNameStrategy: 'non-scoped' } },
    environment: 'jsdom',
    // The module cache is keyed by file, so it would serve modules transformed in
    // one compiler mode to a run in another mode.
    fsModuleCache: false,
    globals: true,
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    setupFiles: ['./tests/unit/setup.ts'],
    testTimeout: 20_000,
  },
});

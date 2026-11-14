import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * MRT_REACT_COMPILER
 *   off      - no React Compiler (default)
 *   consumer - compile only the test files and fixtures, like an app that
 *              installs the package from node_modules
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

const shouldCompile = (id: string) => {
  const file = toPosix(id);
  if (file.includes('/node_modules/')) return false;
  if (compilerMode === 'all') return true;
  if (compilerMode === 'consumer') return file.includes('/tests/unit/');
  return false;
};

export default defineConfig({
  // One transform cache per mode. A shared cache serves uncompiled modules to the compiler runs.
  cacheDir: `node_modules/.vite-mrt/${compilerMode}-${target}`,
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
    alias: [{ find: /^mantine-react-table-ng$/, replacement: entry }],
  },
  test: {
    css: { modules: { classNameStrategy: 'non-scoped' } },
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    setupFiles: ['./tests/unit/setup.ts'],
    testTimeout: 20_000,
  },
});

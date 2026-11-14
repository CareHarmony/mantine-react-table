import * as appPatterns from './fixtures/AppPatterns';
import * as consumerTables from './fixtures/ConsumerTables';
import * as rowObjects from './fixtures/RowObjects';

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards the test harness itself. A compiler run that silently executes
 * uncompiled fixtures would pass every behavior test and prove nothing.
 */
import * as library from 'mantine-react-table-ng';
import { describe, expect, it } from 'vitest';

//the compiled output reads its memo cache through `c(n)` from react/compiler-runtime
const memoCacheCall = /const \$ = \(0,\s*__vite_ssr_import_\d+__\.c\)\(\d+\)/;

const isCompiled = (component: unknown) =>
  memoCacheCall.test(String(component));

const fixtures = Object.entries({
  ...appPatterns,
  ...consumerTables,
  ...rowObjects,
}).filter(
  ([name, value]) => typeof value === 'function' && /^[A-Z]/.test(name),
);

describe(`harness [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  it('finds the fixture components', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(20);
  });

  it.each(fixtures)(
    'compiles %s only when the compiler is on',
    (_name, component) => {
      expect(isCompiled(component)).toBe(__MRT_REACT_COMPILER__ !== 'off');
    },
  );

  it('never compiles the library', () => {
    //`all` mode runs the compiler over the bundle, which must opt itself out
    const libraryComponents = [
      library.MantineReactTable,
      library.MRT_TablePaper,
      library.MRT_TableBody,
      library.MRT_TableBodyRow,
      library.MRT_TableHeadCell,
      library.MRT_TopToolbar,
      library.useMantineReactTable,
    ];
    for (const component of libraryComponents) {
      expect(isCompiled(component)).toBe(false);
    }
  });

  it('imports the library from the requested target', () => {
    const source = String(library.MRT_TablePaper);
    //the src build keeps JSX dev calls, the dist build was emitted by rollup
    expect(source.includes('jsxDEV')).toBe(__MRT_TEST_TARGET__ === 'src');
  });

  const startsWithOptOut = (file: string) =>
    readFileSync(file, 'utf8').startsWith(`'use no memo';`);

  const sourceFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(file);
      return file.endsWith('.ts') || file.endsWith('.tsx') ? [file] : [];
    });

  it('opts every component and hook source file out of the compiler', () => {
    const files = [
      ...sourceFiles('src/components'),
      ...sourceFiles('src/hooks'),
    ];
    expect(files.length).toBeGreaterThan(60);
    expect(files.filter((file) => !startsWithOptOut(file))).toEqual([]);
  });

  it.runIf(__MRT_TEST_TARGET__ === 'dist')(
    'opts both built bundles out of the compiler',
    () => {
      expect(startsWithOptOut('dist/index.esm.mjs')).toBe(true);
      expect(startsWithOptOut('dist/index.cjs')).toBe(true);
    },
  );
});

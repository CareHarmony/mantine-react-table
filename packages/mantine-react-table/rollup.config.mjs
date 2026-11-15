import pkg from './package.json' with { type: 'json' };
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import del from 'rollup-plugin-delete';
import dts from 'rollup-plugin-dts';
import external from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';

/**
 * TanStack Table v8 keeps mutable row, cell and column instances, which the
 * React Compiler cannot memoize correctly. This directive opts the whole bundle
 * out when a consumer runs the compiler over node_modules or transpiles the
 * package. Consumer code can still be compiled.
 */
const banner = `'use no memo';`;

export default [
  {
    external: [
      '@mantine/core',
      '@mantine/dates',
      '@mantine/hooks',
      '@tabler/icons-react',
      '@tanstack/match-sorter-utils',
      '@tanstack/react-table',
      '@tanstack/react-virtual',
      'clsx',
      'dayjs',
      'react',
    ],
    input: './src/index.ts',
    //each source file carries the directive, and the banner re-adds it to the bundle
    onwarn: (warning, warn) => {
      if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning);
    },
    output: [
      {
        banner,
        file: `./${pkg.main}`,
        format: 'cjs',
        sourcemap: true,
      },
      {
        banner,
        file: `./${pkg.module}`,
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      external(),
      typescript({
        rootDir: './src',
      }),
      postcss({
        extract: true,
        minimize: false,
        modules: true,
      }),
    ],
  },
  {
    input: './dist/types/index.d.ts',
    output: [
      { file: `./dist/index.d.cts`, format: 'cjs' },
      { file: './dist/index.esm.d.mts', format: 'esm' },
    ],
    plugins: [
      copy({
        hook: 'buildStart',
        targets: [{ dest: './', rename: 'styles.css', src: 'dist/index.css' }],
      }),
      del({
        hook: 'buildEnd',
        targets: ['dist/index.css', 'dist/index.esm.css', 'dist/types'],
      }),
      dts(),
    ],
  },
];

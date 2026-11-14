/* eslint-disable */
import typescript from '@rollup/plugin-typescript';
import fs from 'fs';
import { rollup } from 'rollup';

//every file in src/locales is a locale, so a new translation needs no change here
const supportedLocales = fs
  .readdirSync('./src/locales')
  .filter((file) => file.endsWith('.ts'))
  .map((file) => file.slice(0, -3));

async function build(locale) {
  const bundle = await rollup({
    input: `./src/locales/${locale}.ts`,
    plugins: [
      typescript({
        declaration: false,
        declarationDir: undefined,
        rootDir: './src',
        sourceMap: false,
      }),
    ],
  });

  await bundle.write({
    file: `./locales/${locale}/index.cjs`,
    format: 'cjs',
    sourcemap: false,
  });

  await bundle.write({
    file: `./locales/${locale}/index.esm.mjs`,
    format: 'esm',
    sourcemap: false,
  });

  const typeFile = `import { type MRT_Localization } from '../..';
export declare const MRT_Localization_${locale
    .toUpperCase()
    .replaceAll('-', '_')}: MRT_Localization;
  `;

  await fs.writeFile(`./locales/${locale}/index.d.cts`, typeFile, (err) => {
    if (err) console.log(err);
  });

  await fs.writeFile(`./locales/${locale}/index.esm.d.mts`, typeFile, (err) => {
    if (err) console.log(err);
  });

  await fs.writeFile(
    `./locales/${locale}/package.json`,
    JSON.stringify(
      {
        main: 'index.cjs',
        module: 'index.esm.mjs',
        sideEffects: false,
        types: 'index.d.cts',
        exports: {
          '.': {
            import: {
              types: './index.esm.d.mts',
              default: './index.esm.mjs',
            },
            require: {
              types: './index.d.cts',
              default: './index.cjs',
            },
          },
          './package.json': './package.json',
        },
      },
      null,
      2,
    ),
    (err) => {
      if (err) console.log(err);
    },
  );

  console.log(`Built ${locale} locale`);
}

async function run() {
  for (const locale of supportedLocales) {
    await build(locale);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

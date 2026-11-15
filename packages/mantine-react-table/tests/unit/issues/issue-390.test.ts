/**
 * `@careharmony/mantine-react-table-ng/locales/fr` failed to resolve because the export
 * target was the directory `./locales/*`. Node and Vite do not look for an
 * index file or a nested package.json behind an `exports` target.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const packageRoot = resolve(__dirname, '../../..');
const packageJson = JSON.parse(
  readFileSync(resolve(packageRoot, 'package.json'), 'utf8'),
);

describe('issue 390: locale subpath exports', () => {
  it('maps a locale subpath to files, with types for each module format', () => {
    expect(packageJson.exports['./locales/*']).toEqual({
      import: {
        default: './locales/*/index.esm.mjs',
        types: './locales/*/index.esm.d.mts',
      },
      require: {
        default: './locales/*/index.cjs',
        types: './locales/*/index.d.cts',
      },
    });
  });

  it('has a source file for the locale in the report', () => {
    expect(existsSync(resolve(packageRoot, 'src/locales/fr.ts'))).toBe(true);
  });
});

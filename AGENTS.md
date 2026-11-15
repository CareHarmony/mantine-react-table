# Agent guide

This repository publishes `@careharmony/mantine-react-table-ng`, a fork of [Mantine React Table](https://github.com/KevinVandy/mantine-react-table) for React 19, Mantine 9 and the React Compiler.

## Layout

| Path | Contents |
| --- | --- |
| `packages/mantine-react-table` | The library. Source in `src`, stories in `stories`, tests in `tests` |
| `apps/mantine-react-table-docs` | Docs site on Next 16 (pages router, webpack mode) |
| `apps/mantine-react-table-docs/examples/*/sandbox` | 112 stand-alone Vite sandboxes. `src/TS.tsx` is shown in the docs and rendered by the unit tests |
| `.github/workflows` | `ci.yml`, `publish.yml`, `visual.yml`, `mirror.yml` |

- Package manager: pnpm 9.3 workspaces with Turborepo. Node 22 in CI, Node 20 minimum.
- Default branch and PR base: `v4`. `origin` is `CareHarmony/mantine-react-table`. `upstream` is `KevinVandy/mantine-react-table`.
- A push to `v4` runs `mirror.yml`, which copies the built package to `CareHarmony/mantine-react-table-ch`.

## Versions

- React and React DOM 19.3.1, peer range `>=19.2.0`.
- `@mantine/core`, `@mantine/dates`, `@mantine/hooks` 9.8.0, peer range `>=9.0.0`.
- `@tanstack/react-table` 8.21.3 and `@tanstack/react-virtual` 3.14.26 are bundled dependencies.
- Vitest 5, Playwright, Storybook 8.6, ESLint 8 in the library, ESLint 9 in the docs app.

## Commands

Run library commands from `packages/mantine-react-table`.

| Command | Purpose |
| --- | --- |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc` for source, then for unit tests |
| `pnpm lib:build` | Rollup bundle, size-limit check (58 kB cjs, 55 kB esm), then 39 locale builds |
| `pnpm test` | Unit tests, compiler off |
| `pnpm test:compiler` | Compiler on tests, fixtures and docs examples |
| `pnpm test:compiler:all` | Compiler also on library source |
| `pnpm test:compiler:dist` | Compiler on the built bundle. Run `pnpm lib:build` first |
| `pnpm test:all` | All four modes, about 8 minutes |
| `pnpm test:coverage` | Compiler off with V8 coverage. Thresholds: 93% lines, 85% branches, 90% functions |
| `pnpm storybook:build` then `pnpm test:visual` | 363 Playwright screenshot comparisons |

Run docs commands from `apps/mantine-react-table-docs`: `pnpm lint`, `pnpm typecheck`, `pnpm docs:build`, `pnpm docs:dev` (port 3001). The docs app imports the built library, so run `pnpm lib:build` first.

## React Compiler design

TanStack Table v8 keeps one mutable table, row, cell, column and header instance. The compiler caches reads on reference identity, so compiled consumer code would show stale values. Three mechanisms prevent that:

- `useMantineReactTable` returns a new `table` reference when table state or options change (`src/hooks/useMRT_TableSnapshot.ts`).
- Rows, cells, columns and headers passed to render callbacks are `Proxy` views, cached per table reference (`src/utils/snapshot.utils.ts`). Views are `Proxy` objects because MRT and consumers spread rows (`setEditingRow({ ...row })`).
- Virtualizers re-render once the scroll element is mounted (`src/hooks/useMRT_VirtualizerScrollElement.ts`).

Rules that follow from this:

- Every file in `src/components` and `src/hooks` starts with `'use no memo';`. Rollup adds the same banner to both bundles. A harness test fails if a file lacks it.
- Create row, cell, column and header views in the component that receives them (`getMRT_RowView` and siblings) before passing them to consumer callbacks.
- ESLint cannot detect compiler incompatibility. The tests under the compiler are the detector.

## Tests

- `tests/unit/setup.ts` stubs `matchMedia`, `ResizeObserver` and `IntersectionObserver` for jsdom.
- `tests/unit/fixtures/render.tsx` exports `renderWithMantine`, which uses `MantineProvider env="test"` (no transitions).
- Import the library only as `@careharmony/mantine-react-table-ng`. `vitest.config.ts` aliases it to `src/index.ts` or to `dist`, so a relative import into `src` breaks the `dist` mode.
- `MRT_REACT_COMPILER` is `off`, `consumer` or `all`. `MRT_TEST_TARGET` is `src` or `dist`. Tests read them as `__MRT_REACT_COMPILER__` and `__MRT_TEST_TARGET__`.
- `fsModuleCache: false` must stay. Vitest 5 otherwise serves modules compiled in one mode to a run in another mode.
- `tests/unit/compiler-harness.test.tsx` fails if fixtures are not compiled in a compiler run.
- `tests/unit/examples.test.tsx` renders all 109 docs examples, sorts and selects rows.
- `tests/unit/features` holds asserted tests per feature. `tests/unit/issues` holds one regression test per fixed issue.
- Assert observable behavior: row contents, table state, callback arguments.
- The table writes the chosen filter mode onto column definitions (`columnDef._filterFn`). Build column arrays inside each test, or tests leak state.
- Passing `onGlobalFilterChange` or another `on*Change` without the matching `state` freezes that state. That is TanStack behavior.
- Filter inputs debounce 200 ms (400 ms with `manualFiltering`); the search input 250 ms. Use `waitFor` on the final rows.
- Mantine date inputs emit every parsable partial date while typing.
- Virtualized tables need consistent fake sizes in jsdom: `clientHeight`, `clientWidth`, `offsetHeight`, `offsetWidth` and `getBoundingClientRect` must agree, or measuring loops.
- Visual baselines in `tests/snapshots` end in `-chromium-win32.png`. They were captured on Windows.

## Mantine 9 specifics

- Date inputs emit `'YYYY-MM-DD'` strings. `src/fns/filterFns.ts` converts them when the cell value is a `Date`.
- `@mantine/code-highlight` ships no highlighter. The docs app registers `highlight.js` in `styles/ThemeContext.tsx`.
- React 19 has no global `JSX` namespace. Import `type JSX` from `react`.
- Nested selectors (`'& .class'`, `'@media ...'`) are invalid in `style` props. Use a CSS module or responsive props.

## Docs app

- Build and dev use `--webpack`. Examples load their source with inline `raw-loader`, which Turbopack does not support.
- `eslint-config-next` 16 enables the React Compiler lint rules, including `react-hooks/set-state-in-effect`. Keep docs code and examples clean under them.
- Examples that read browser state in a `useState` initializer are loaded with `next/dynamic` and `ssr: false` in their `index.tsx`.
- `pnpm docs:build` rewrites `public/sitemap*.xml` and `public/robots.txt`. Do not commit those changes.
- Sandbox `package.json` files pin `@careharmony/mantine-react-table-ng` and have no lockfiles.

## Releases

- `publish.yml` publishes on a GitHub release whose tag is `v` plus the version in `packages/mantine-react-table/package.json`. It needs the `NPM_TOKEN` repository secret.
- A prerelease version publishes under its prerelease name as dist-tag (`4.0.0-beta.0` gives `beta`). Other versions publish as `latest`.
- `prepublishOnly` runs lint, typecheck, the build and all four test modes.
- `visual.yml` is manual and runs on a Windows runner.

## Working conventions

- Source files check out with CRLF line endings (`core.autocrlf=true`). Scripts that match text must handle `\r\n`.
- In Git Bash on Windows, heredocs and `node -e` drop backslashes. Write scripts to a file first.
- Keep `README.md` at the repository root as the source. The build copies it into the package.
- Mention upstream issues as plain text ("upstream issue 554"). A `#554` or `KevinVandy/mantine-react-table#554` reference creates a backlink on the upstream repository.
- Docs branding links and badges still point at the upstream project.

## Known open items

- RTL column pinning CSS (upstream issues 526, 480) is not verified in a browser.
- Upstream issues 548, 474, 467 and 464 are cosmetic CSS reports, not addressed.
- 15 `Link` components in the docs app use `legacyBehavior`, which Next 16 deprecates.
- `next-plausible` is pinned to 3.12.2. Version 4 changes the analytics API.
- A TanStack Table v9 migration is a separate, later release.

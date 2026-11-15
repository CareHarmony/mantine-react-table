import { MRT_FilterFns } from '@careharmony/mantine-react-table-ng';
import { describe, expect, it, vi } from 'vitest';

type FilterRow = Parameters<typeof MRT_FilterFns.contains>[0];

/** A row stub: the MRT filter functions only call `row.getValue(columnId)`. */
const row = (value: unknown) =>
  ({ getValue: () => value }) as unknown as FilterRow;

const mrtFilterFnNames = [
  'between',
  'betweenInclusive',
  'contains',
  'empty',
  'endsWith',
  'equals',
  'fuzzy',
  'greaterThan',
  'greaterThanOrEqualTo',
  'lessThan',
  'lessThanOrEqualTo',
  'notEmpty',
  'notEquals',
  'startsWith',
] as const;

describe(`MRT_FilterFns [compiler=${__MRT_REACT_COMPILER__}, target=${__MRT_TEST_TARGET__}]`, () => {
  it('keeps the TanStack filter functions next to the MRT ones', () => {
    expect(Object.keys(MRT_FilterFns)).toEqual(
      expect.arrayContaining([
        ...mrtFilterFnNames,
        'arrIncludes',
        'arrIncludesAll',
        'arrIncludesSome',
        'equalsString',
        'inNumberRange',
        'includesString',
        'includesStringSensitive',
        'weakEquals',
      ]),
    );
  });

  describe('contains', () => {
    it('matches a substring without regard to case or outer whitespace', () => {
      expect(MRT_FilterFns.contains(row('Omaha'), 'city', 'MAH')).toBe(true);
      expect(MRT_FilterFns.contains(row('  Omaha '), 'city', ' oma ')).toBe(
        true,
      );
      expect(MRT_FilterFns.contains(row('Omaha'), 'city', 'boi')).toBe(false);
    });

    it('compares numbers as text', () => {
      expect(MRT_FilterFns.contains(row(1234), 'n', 23)).toBe(true);
      expect(MRT_FilterFns.contains(row(1234), 'n', '5')).toBe(false);
    });

    it('does not match a missing cell value', () => {
      expect(MRT_FilterFns.contains(row(undefined), 'city', 'a')).toBeFalsy();
      expect(MRT_FilterFns.contains(row(null), 'city', 'a')).toBeFalsy();
    });
  });

  describe('startsWith and endsWith', () => {
    it('startsWith matches only the beginning of the value', () => {
      expect(MRT_FilterFns.startsWith(row('Omaha'), 'city', 'om')).toBe(true);
      expect(MRT_FilterFns.startsWith(row(' Omaha'), 'city', 'OM ')).toBe(true);
      expect(MRT_FilterFns.startsWith(row('Omaha'), 'city', 'aha')).toBe(false);
      expect(MRT_FilterFns.startsWith(row(undefined), 'city', 'o')).toBeFalsy();
    });

    it('endsWith matches only the end of the value', () => {
      expect(MRT_FilterFns.endsWith(row('Omaha'), 'city', 'AHA')).toBe(true);
      expect(MRT_FilterFns.endsWith(row('Omaha '), 'city', ' ha')).toBe(true);
      expect(MRT_FilterFns.endsWith(row('Omaha'), 'city', 'om')).toBe(false);
      expect(MRT_FilterFns.endsWith(row(undefined), 'city', 'a')).toBeFalsy();
    });
  });

  describe('equals and notEquals', () => {
    it('equals compares the trimmed lower-case text', () => {
      expect(MRT_FilterFns.equals(row('Omaha'), 'city', ' OMAHA ')).toBe(true);
      expect(MRT_FilterFns.equals(row('Omaha'), 'city', 'Omah')).toBe(false);
      expect(MRT_FilterFns.equals(row(31), 'age', '31')).toBe(true);
      expect(MRT_FilterFns.equals(row(true), 'active', 'true')).toBe(true);
      expect(MRT_FilterFns.equals(row(false), 'active', 'true')).toBe(false);
    });

    it('notEquals is the inverse of equals', () => {
      expect(MRT_FilterFns.notEquals(row('Omaha'), 'city', 'omaha')).toBe(
        false,
      );
      expect(MRT_FilterFns.notEquals(row('Omaha'), 'city', 'Boise')).toBe(true);
      expect(MRT_FilterFns.notEquals(row(undefined), 'city', 'Boise')).toBe(
        true,
      );
    });
  });

  describe('greaterThan and lessThan', () => {
    it('compare numerically when both sides are numeric', () => {
      //'10' sorts before '9' as text, so these prove the numeric path
      expect(MRT_FilterFns.greaterThan(row(10), 'age', '9')).toBe(true);
      expect(MRT_FilterFns.greaterThan(row('9'), 'age', 10)).toBe(false);
      expect(MRT_FilterFns.greaterThan(row(10), 'age', 10)).toBe(false);
      expect(MRT_FilterFns.lessThan(row(9), 'age', '10')).toBe(true);
      expect(MRT_FilterFns.lessThan(row('10'), 'age', 9)).toBe(false);
      expect(MRT_FilterFns.lessThan(row(10), 'age', 10)).toBe(false);
    });

    it('compare as lower-case text when a side is not numeric', () => {
      expect(MRT_FilterFns.greaterThan(row('Boise'), 'city', 'akron')).toBe(
        true,
      );
      expect(MRT_FilterFns.greaterThan(row('Akron'), 'city', 'boise')).toBe(
        false,
      );
      expect(MRT_FilterFns.lessThan(row('Akron'), 'city', 'BOISE')).toBe(true);
      expect(MRT_FilterFns.lessThan(row('Boise'), 'city', 'Akron')).toBe(false);
    });

    it('the OrEqualTo variants also accept the boundary value', () => {
      expect(MRT_FilterFns.greaterThanOrEqualTo(row(10), 'age', 10)).toBe(true);
      expect(MRT_FilterFns.greaterThanOrEqualTo(row(11), 'age', 10)).toBe(true);
      expect(MRT_FilterFns.greaterThanOrEqualTo(row(9), 'age', 10)).toBe(false);
      expect(MRT_FilterFns.lessThanOrEqualTo(row(10), 'age', 10)).toBe(true);
      expect(MRT_FilterFns.lessThanOrEqualTo(row(9), 'age', 10)).toBe(true);
      expect(MRT_FilterFns.lessThanOrEqualTo(row(11), 'age', 10)).toBe(false);
      expect(
        MRT_FilterFns.greaterThanOrEqualTo(row('Akron'), 'city', 'AKRON'),
      ).toBe(true);
      expect(
        MRT_FilterFns.lessThanOrEqualTo(row('Akron'), 'city', 'akron'),
      ).toBe(true);
    });
  });

  describe('between and betweenInclusive', () => {
    it('between excludes both bounds', () => {
      expect(MRT_FilterFns.between(row(30), 'age', [30, 40])).toBe(false);
      expect(MRT_FilterFns.between(row(31), 'age', [30, 40])).toBe(true);
      expect(MRT_FilterFns.between(row(40), 'age', ['30', '40'])).toBe(false);
      expect(MRT_FilterFns.between(row(41), 'age', [30, 40])).toBe(false);
    });

    it('betweenInclusive includes both bounds', () => {
      expect(MRT_FilterFns.betweenInclusive(row(30), 'age', [30, 40])).toBe(
        true,
      );
      expect(MRT_FilterFns.betweenInclusive(row(40), 'age', ['30', '40'])).toBe(
        true,
      );
      expect(MRT_FilterFns.betweenInclusive(row(29), 'age', [30, 40])).toBe(
        false,
      );
      expect(MRT_FilterFns.betweenInclusive(row(41), 'age', [30, 40])).toBe(
        false,
      );
    });

    it.each(['between', 'betweenInclusive'] as const)(
      '%s ignores a bound that is an empty string or undefined',
      (name) => {
        const fn = MRT_FilterFns[name];
        const open = undefined as unknown as string;
        expect(fn(row(99), 'age', [35, ''])).toBe(true);
        expect(fn(row(20), 'age', [35, ''])).toBe(false);
        expect(fn(row(99), 'age', [35, open])).toBe(true);
        expect(fn(row(1), 'age', ['', 35])).toBe(true);
        expect(fn(row(50), 'age', ['', 35])).toBe(false);
        expect(fn(row(1), 'age', [open, 35])).toBe(true);
        expect(fn(row(50), 'age', ['', ''])).toBe(true);
      },
    );

    it.each(['between', 'betweenInclusive'] as const)(
      '%s drops the upper bound when the minimum exceeds the maximum',
      (name) => {
        const fn = MRT_FilterFns[name];
        expect(fn(row(60), 'age', [50, 10])).toBe(true);
        expect(fn(row(20), 'age', [50, 10])).toBe(false);
      },
    );

    it('compares text bounds alphabetically', () => {
      expect(
        MRT_FilterFns.between(row('Boise'), 'city', ['akron', 'omaha']),
      ).toBe(true);
      expect(
        MRT_FilterFns.between(row('Tulsa'), 'city', ['akron', 'omaha']),
      ).toBe(false);
      expect(
        MRT_FilterFns.betweenInclusive(row('Omaha'), 'city', [
          'akron',
          'omaha',
        ]),
      ).toBe(true);
    });
  });

  describe('empty and notEmpty', () => {
    it.each([
      ['an empty string', '', true],
      ['whitespace', '   ', true],
      ['undefined', undefined, true],
      ['null', null, true],
      ['text', 'Omaha', false],
      ['zero', 0, false],
      ['false', false, false],
    ])('treat %s as empty=%s', (_label, value, isEmpty) => {
      expect(MRT_FilterFns.empty(row(value), 'city', ' ')).toBe(isEmpty);
      expect(MRT_FilterFns.notEmpty(row(value), 'city', ' ')).toBe(!isEmpty);
    });
  });

  describe('fuzzy', () => {
    it('passes a ranked match and reports the ranking through addMeta', () => {
      const addMeta = vi.fn();
      expect(MRT_FilterFns.fuzzy(row('Omaha'), 'city', 'omh', addMeta)).toBe(
        true,
      );
      expect(addMeta).toHaveBeenCalledTimes(1);
      expect(addMeta.mock.calls[0][0]).toMatchObject({
        passed: true,
        rankedValue: 'Omaha',
      });
    });

    it('rejects a value that has no ordered match', () => {
      const addMeta = vi.fn();
      expect(MRT_FilterFns.fuzzy(row('Omaha'), 'city', 'xyz', addMeta)).toBe(
        false,
      );
      expect(addMeta.mock.calls[0][0]).toMatchObject({ passed: false });
    });

    it('ranks an exact match above a scattered match', () => {
      const ranks: number[] = [];
      const addMeta = (info: { rank: number }) => ranks.push(info.rank);
      MRT_FilterFns.fuzzy(row('Omaha'), 'city', 'omaha', addMeta);
      MRT_FilterFns.fuzzy(row('Omaha'), 'city', 'omh', addMeta);
      expect(ranks[0]).toBeGreaterThan(ranks[1]);
    });
  });

  describe('autoRemove', () => {
    it.each(mrtFilterFnNames)(
      '%s removes the filter for a falsy value and keeps it otherwise',
      (name) => {
        const { autoRemove } = MRT_FilterFns[name];
        expect(autoRemove('')).toBe(true);
        expect(autoRemove(undefined)).toBe(true);
        expect(autoRemove(null)).toBe(true);
        expect(autoRemove('a')).toBe(false);
        expect(autoRemove(5)).toBe(false);
        //the empty/notEmpty modes store a single space as their filter value
        expect(autoRemove(' ')).toBe(false);
        expect(autoRemove(['', ''])).toBe(false);
      },
    );
  });
});

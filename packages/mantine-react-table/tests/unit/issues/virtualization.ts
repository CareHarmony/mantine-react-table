import { vi } from 'vitest';

/**
 * jsdom reports every element as 0 x 0, so TanStack Virtual renders no items.
 * These getters give the scroll container and the measured items a size.
 * The restoreMocks option in vitest.config.ts removes the spies after each test.
 */
export const mockElementSizes = ({
  containerHeight = 600,
  containerWidth = 1000,
  itemHeight = 50,
  itemWidth = 180,
} = {}) => {
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(
    containerHeight,
  );
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(
    containerWidth,
  );
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(
    itemHeight,
  );
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(
    itemWidth,
  );
};

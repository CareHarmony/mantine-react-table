import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => cleanup());

// jsdom lacks the browser APIs that Mantine and TanStack Virtual call.
window.matchMedia =
  window.matchMedia ??
  ((query: string) => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  }));

class ResizeObserverStub {
  disconnect() {}
  observe() {}
  unobserve() {}
}
window.ResizeObserver = window.ResizeObserver ?? ResizeObserverStub;

class IntersectionObserverStub {
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
}
window.IntersectionObserver =
  window.IntersectionObserver ??
  (IntersectionObserverStub as unknown as typeof IntersectionObserver);

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

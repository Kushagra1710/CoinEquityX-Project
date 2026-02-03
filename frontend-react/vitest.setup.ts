import '@testing-library/jest-dom';

// Polyfill matchMedia for jsdom
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: query.includes('dark') ? false : false,
    media: query,
    onchange: null,
    addListener: () => { },
    removeListener: () => { },
    addEventListener: () => { },
    removeEventListener: () => { },
    dispatchEvent: () => false
  });
}

// Stub canvas.getContext for jsdom
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () =>
  ({
    beginPath: () => { },
    moveTo: () => { },
    lineTo: () => { },
    stroke: () => { },
    clearRect: () => { },
    fillRect: () => { },
    createLinearGradient: () => ({ addColorStop: () => { } }),
    fillStyle: '',
    strokeStyle: ''
  } as unknown as CanvasRenderingContext2D);
}

// Mock localStorage for jsdom
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null
  };
})();

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
}

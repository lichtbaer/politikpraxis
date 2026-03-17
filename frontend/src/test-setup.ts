/** Vitest Setup: Mock localStorage für Node-Umgebung */
const localStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

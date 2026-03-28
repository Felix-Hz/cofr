import { afterEach } from "vitest";

vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5784");
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

// Node.js 22+ has a built-in localStorage that conflicts with happy-dom.
// Provide a proper in-memory implementation.
const storage = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
  get length() {
    return storage.size;
  },
  key: (index: number) => [...storage.keys()][index] ?? null,
};
vi.stubGlobal("localStorage", localStorageMock);

afterEach(() => {
  storage.clear();
  vi.restoreAllMocks();
  // Re-stub after restoreAllMocks clears stubs
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// jsdom 26 knows <dialog> and its `open` attribute but not its methods: the two the components use.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

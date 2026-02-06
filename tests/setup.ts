import "@testing-library/jest-dom";

// Mock URL.createObjectURL and URL.revokeObjectURL for blob URL tests
const createObjectURL = jest.fn((blob: Blob) => `blob:mock-${Math.random()}-${blob.size}`);
const revokeObjectURL = jest.fn();

global.URL.createObjectURL = createObjectURL;
global.URL.revokeObjectURL = revokeObjectURL;

// Polyfill Blob.text() for jsdom (used by SvgXmlnsAttributeCheck)
if (typeof Blob !== "undefined" && !Blob.prototype.text) {
  Blob.prototype.text = function (): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsText(this);
    });
  };
}

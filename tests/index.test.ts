/// <reference types="jest" />
import { useFileSelector, FileSelector, defaultTypeExtensions } from "../src/index";

describe("index", () => {
  it("exports useFileSelector", () => {
    expect(useFileSelector).toBeDefined();
    expect(typeof useFileSelector).toBe("function");
  });

  it("exports FileSelector", () => {
    expect(FileSelector).toBeDefined();
    expect(typeof FileSelector).toBe("function");
  });

  it("exports defaultTypeExtensions", () => {
    expect(defaultTypeExtensions).toBeDefined();
    expect(defaultTypeExtensions["image/png"]).toBe(".png");
  });
});

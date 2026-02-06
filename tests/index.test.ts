import { useFileSelector } from "../src/index";

describe("index", () => {
  it("exports useFileSelector", () => {
    expect(useFileSelector).toBeDefined();
    expect(typeof useFileSelector).toBe("function");
  });
});

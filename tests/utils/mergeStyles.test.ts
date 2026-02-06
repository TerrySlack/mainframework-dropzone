import { mergeStyles } from "../../src/shared/utils/mergeStyles";

describe("mergeStyles", () => {
  it("merges multiple class strings", () => {
    expect(mergeStyles("foo", "bar")).toBe("foo bar");
  });

  it("handles undefined and null", () => {
    expect(mergeStyles("foo", undefined, null, "bar")).toBe("foo bar");
  });

  it("merges conflicting Tailwind classes with tailwind-merge", () => {
    expect(mergeStyles("p-4", "p-2")).toBe("p-2");
  });

  it("handles conditional classes via clsx", () => {
    expect(mergeStyles("base", false && "hidden", true && "visible")).toBe("base visible");
  });

  it("handles array of classes", () => {
    expect(mergeStyles(["foo", "bar"])).toBe("foo bar");
  });

  it("handles empty input", () => {
    expect(mergeStyles()).toBe("");
  });

  it("handles single class", () => {
    expect(mergeStyles("single")).toBe("single");
  });
});

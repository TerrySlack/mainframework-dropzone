/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

jest.mock("../../src/shared/utils/processUploadedFiles", () => {
  const actual = jest.requireActual<typeof import("../../src/shared/utils/processUploadedFiles")>(
    "../../src/shared/utils/processUploadedFiles",
  );
  return {
    ...actual,
    svgXmlnsAttributeCheck: async (
      file: File,
      allowableTypes?: typeof actual.defaultTypeExtensions,
      extensionListLower?: readonly string[],
    ) => {
      if (file.name === "null-target.png") return null;
      return actual.svgXmlnsAttributeCheck(file, allowableTypes, extensionListLower);
    },
  };
});

import { renderHook, act, render, fireEvent } from "@testing-library/react";
import { useFileSelector } from "../../src/shared/hooks/useFileSelector";

describe("useFileSelector null async results", () => {
  it("moves files to invalidFiles when svgXmlnsAttributeCheck resolves null", async () => {
    const { result } = renderHook(() => useFileSelector());
    const { container } = render(<result.current.FileSelector />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const nullFile = new File(["x"], "null-target.png", { type: "image/png" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [nullFile] } });
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.validFiles.length).toBe(0);
    expect(result.current.invalidFiles.some((f) => f.name === "null-target.png")).toBe(true);
  });
});

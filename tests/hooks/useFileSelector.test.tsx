/// <reference types="jest" />
import { renderHook, act, render, fireEvent, waitFor } from "@testing-library/react";
import { useFileSelector } from "../../src/shared/hooks/useFileSelector";

describe("useFileSelector", () => {
  it("returns initial state with empty validFiles and invalidFiles", () => {
    const { result } = renderHook(() => useFileSelector());
    expect(result.current.validFiles).toEqual([]);
    expect(result.current.invalidFiles).toEqual([]);
  });

  it("returns FileSelector component", () => {
    const { result } = renderHook(() => useFileSelector());
    expect(result.current.FileSelector).toBeDefined();
    expect(typeof result.current.FileSelector).toBe("function");
  });

  it("clearCache clears valid and invalid files", async () => {
    const { result } = renderHook(() => useFileSelector({ maximumUploadCount: 10, maximumFileSize: 5e6 }));

    const FileSelectorComponent = result.current.FileSelector;
    const { container } = render(<FileSelectorComponent />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const pngFile = new File(["x"], "test.png", { type: "image/png" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [pngFile] } });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.validFiles.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearCache();
    });

    expect(result.current.validFiles).toEqual([]);
    expect(result.current.invalidFiles).toEqual([]);
  });

  it("getValidFileStreams returns file array", async () => {
    const { result } = renderHook(() => useFileSelector());
    const FileSelectorComponent = result.current.FileSelector;
    const { container } = render(<FileSelectorComponent />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const pngFile = new File(["x"], "test.png", { type: "image/png" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [pngFile] } });
    });

    await act(async () => {
      await Promise.resolve();
    });

    const streams = result.current.getValidFileStreams();
    expect(Array.isArray(streams)).toBe(true);
  });

  it("onRemoveFile removes file at index", async () => {
    const { result } = renderHook(() => useFileSelector());
    const FileSelectorComponent = result.current.FileSelector;
    const { container } = render(<FileSelectorComponent />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const pngFile = new File(["x"], "test.png", { type: "image/png" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [pngFile] } });
    });

    await act(async () => {
      await Promise.resolve();
    });

    const initialCount = result.current.validFiles.length;
    if (initialCount > 0) {
      act(() => {
        result.current.onRemoveFile(0);
      });
      expect(result.current.validFiles.length).toBe(initialCount - 1);
    }
  });

  it("rejects files exceeding maximum upload count", async () => {
    const { result } = renderHook(() => useFileSelector({ maximumUploadCount: 1, maximumFileSize: 5e6 }));

    const FileSelectorComponent = result.current.FileSelector;
    const { container } = render(<FileSelectorComponent />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const files = [new File(["a"], "a.png", { type: "image/png" }), new File(["b"], "b.png", { type: "image/png" })];

    await act(async () => {
      fireEvent.change(input, { target: { files } });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.maxUploadError.status).toBe(true);
    expect(result.current.maxUploadError.message).toContain("maximum");
  });

  it("rejects files exceeding maximum file size", async () => {
    const { result } = renderHook(() => useFileSelector({ maximumUploadCount: 10, maximumFileSize: 1 }));

    const FileSelectorComponent = result.current.FileSelector;
    const { container } = render(<FileSelectorComponent />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const largeFile = new File([new ArrayBuffer(1000)], "large.png", { type: "image/png" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [largeFile] } });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.maxFileSizeError.status).toBe(true);
    expect(result.current.maxFileSizeError.message).toContain("size");
  });

  it("onDrop processes files from DataTransfer", async () => {
    const { result } = renderHook(() => useFileSelector());
    const FileSelectorComponent = result.current.FileSelector;
    const { getByRole } = render(<FileSelectorComponent />);
    const button = getByRole("button", { name: /Drag 'n' drop|Choose files/ });

    const pngFile = new File(["x"], "test.png", { type: "image/png" });
    const dataTransfer = {
      files: [pngFile],
      preventDefault: jest.fn(),
      dropEffect: "",
    };

    await act(async () => {
      fireEvent.drop(button, { dataTransfer });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.validFiles.length).toBeGreaterThan(0);
  });

  it("onIdChange renames a file at a given index", async () => {
    const { result } = renderHook(() => useFileSelector());
    const FileSelectorComponent = result.current.FileSelector;
    const { container } = render(<FileSelectorComponent />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const pngFile = new File(["x"], "original.png", { type: "image/png" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [pngFile] } });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.validFiles.length).toBeGreaterThan(0);

    act(() => {
      result.current.onIdChange(0, "renamed", result.current.validFiles);
    });

    expect(result.current.validFiles[0].id).toBe("renamed");
  });

  it("clearCache resets error flags in addition to file arrays", async () => {
    const { result } = renderHook(() => useFileSelector({ maximumUploadCount: 1, maximumFileSize: 5e6 }));
    const FileSelectorComponent = result.current.FileSelector;
    const { container } = render(<FileSelectorComponent />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const files = [new File(["a"], "a.png", { type: "image/png" }), new File(["b"], "b.png", { type: "image/png" })];

    await act(async () => {
      fireEvent.change(input, { target: { files } });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.maxUploadError.status).toBe(true);

    act(() => {
      result.current.clearCache();
    });

    expect(result.current.maxUploadError.status).toBe(false);
    expect(result.current.maxFileSizeError.status).toBe(false);
    expect(result.current.validFiles).toEqual([]);
    expect(result.current.invalidFiles).toEqual([]);
  });

  it("invalid file type populates invalidFiles and not validFiles", async () => {
    const { result } = renderHook(() => useFileSelector());
    const FileSelectorComponent = result.current.FileSelector;
    const { container } = render(<FileSelectorComponent />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const txtFile = new File(["hello"], "test.txt", { type: "text/plain" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [txtFile] } });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.invalidFiles.length).toBeGreaterThan(0);
    expect(result.current.validFiles.length).toBe(0);
  });

  it("setMaximumFileSizeExceeded sets and clears the error", () => {
    const { result } = renderHook(() => useFileSelector());

    act(() => {
      result.current.setMaximumFileSizeExceeded(true);
    });

    expect(result.current.maxFileSizeError.status).toBe(true);
    expect(result.current.maxFileSizeError.message).toContain("size");

    act(() => {
      result.current.setMaximumFileSizeExceeded(false);
    });

    expect(result.current.maxFileSizeError.status).toBe(false);
    expect(result.current.maxFileSizeError.message).toBe("");
  });

  it("setMaximumUploadsExceeded sets and clears the error", () => {
    const { result } = renderHook(() => useFileSelector());

    act(() => {
      result.current.setMaximumUploadsExceeded(true, 5, 3);
    });

    expect(result.current.maxUploadError.status).toBe(true);
    expect(result.current.maxUploadError.message).toContain("maximum");

    act(() => {
      result.current.setMaximumUploadsExceeded(false);
    });

    expect(result.current.maxUploadError.status).toBe(false);
    expect(result.current.maxUploadError.message).toBe("");
  });

  it("onCancel clears validFiles and invalidFiles", async () => {
    const { result } = renderHook(() => useFileSelector());
    const FileSelectorComponent = result.current.FileSelector;
    const { container } = render(<FileSelectorComponent />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const pngFile = new File(["x"], "test.png", { type: "image/png" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [pngFile] } });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.validFiles.length).toBeGreaterThan(0);

    act(() => {
      result.current.onCancel();
    });

    expect(result.current.validFiles).toEqual([]);
    expect(result.current.invalidFiles).toEqual([]);
  });

  it("clearBlob does not throw when called on a valid file", async () => {
    const { result } = renderHook(() => useFileSelector());
    const FileSelectorComponent = result.current.FileSelector;
    const { container } = render(<FileSelectorComponent />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const pngFile = new File(["x"], "test.png", { type: "image/png" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [pngFile] } });
    });

    await act(async () => {
      await Promise.resolve();
    });

    if (result.current.validFiles.length > 0) {
      expect(() => result.current.clearBlob(result.current.validFiles[0].file as File)).not.toThrow();
    }
  });

  it("custom acceptedTypes produces correct accept attribute on input", () => {
    const customTypes = { "text/plain": ".txt", "image/gif": ".gif" };
    const { result } = renderHook(() => useFileSelector({ acceptedTypes: customTypes }));
    const FileSelectorComponent = result.current.FileSelector;
    const { container } = render(<FileSelectorComponent />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const acceptValue = input.getAttribute("accept") ?? "";
    expect(acceptValue).toContain(".txt");
    expect(acceptValue).toContain(".gif");
  });

  it("SVG without xmlns is accepted and has xmlns injected", async () => {
    const { result } = renderHook(() => useFileSelector());
    const FileSelectorComponent = result.current.FileSelector;
    const { container } = render(<FileSelectorComponent />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const svgFile = new File(["<svg><circle r='5'/></svg>"], "test.svg", { type: "image/svg+xml" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [svgFile] } });
    });

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.validFiles.length).toBeGreaterThan(0);
    });
    const processedFile = result.current.validFiles[0].file as File;
    const content = await processedFile.text();
    expect(content).toContain("xmlns=");
  });
});

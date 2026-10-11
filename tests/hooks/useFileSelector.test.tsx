/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />
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

  it("revokes blob URLs when oversize batch clears existing valid files", async () => {
    const revokeSpy = jest.spyOn(URL, "revokeObjectURL");
    const { result } = renderHook(() => useFileSelector({ maximumFileSize: 100 }));
    const FileSelectorComponent = result.current.FileSelector;
    const { container } = render(<FileSelectorComponent />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const smallFile = new File(["x"], "small.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [smallFile] } });
    });
    await act(async () => {
      await Promise.resolve();
    });

    const largeFile = new File([new ArrayBuffer(200)], "large.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [largeFile] } });
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(revokeSpy).toHaveBeenCalled();
    revokeSpy.mockRestore();
  });

  it("sets maxFileSizeError when file read fails", async () => {
    const textSpy = jest.spyOn(File.prototype, "text").mockRejectedValue(new Error("read fail"));
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
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.maxFileSizeError.status).toBe(true);
    textSpy.mockRestore();
  });

  it("allowMultiple false removes multiple on input", () => {
    const { result } = renderHook(() => useFileSelector({ allowMultiple: false }));
    const { container } = render(<result.current.FileSelector />);
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toHaveAttribute("multiple");
  });

  it("defers sync-invalid files until async valid batch completes", async () => {
    const { result } = renderHook(() => useFileSelector());
    const FileSelectorComponent = result.current.FileSelector;
    const { container } = render(<FileSelectorComponent />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const pngFile = new File(["x"], "test.png", { type: "image/png" });
    const txtFile = new File(["hello"], "test.txt", { type: "text/plain" });

    act(() => {
      fireEvent.change(input, { target: { files: [pngFile, txtFile] } });
    });

    expect(result.current.invalidFiles).toEqual([]);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.validFiles.length).toBe(1);
    expect(result.current.invalidFiles.length).toBe(1);
    expect(result.current.invalidFiles[0].name).toBe("test.txt");
  });

  it("setMaximumFileSizeExceeded accepts custom message", () => {
    const { result } = renderHook(() => useFileSelector());
    act(() => {
      result.current.setMaximumFileSizeExceeded(true, "custom processing error");
    });
    expect(result.current.maxFileSizeError.message).toBe("custom processing error");
  });
  it("getValidFileStreams returns empty array initially", () => {
    const { result } = renderHook(() => useFileSelector());
    expect(result.current.getValidFileStreams()).toEqual([]);
  });

  it("clearBlobs revokes blob URLs for valid files", async () => {
    const revokeSpy = jest.spyOn(URL, "revokeObjectURL");
    const { result } = renderHook(() => useFileSelector());
    const { container } = render(<result.current.FileSelector />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const pngFile = new File(["x"], "test.png", { type: "image/png" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [pngFile] } });
    });
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.clearBlobs();
    });

    expect(revokeSpy).toHaveBeenCalled();
    revokeSpy.mockRestore();
  });

  it("onRemoveFile keeps other files when removing one of two", async () => {
    const { result } = renderHook(() => useFileSelector());
    const { container } = render(<result.current.FileSelector />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [new File(["a"], "a.png", { type: "image/png" }), new File(["b"], "b.png", { type: "image/png" })];

    await act(async () => {
      fireEvent.change(input, { target: { files } });
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.validFiles.length).toBe(2);

    act(() => {
      result.current.onRemoveFile(0);
    });

    expect(result.current.validFiles.length).toBe(1);
    expect((result.current.validFiles[0].file as File).name).toBe("b.png");
  });

  it("onRemoveFile skips clearBlob when entry file is a Blob", async () => {
    const { result } = renderHook(() => useFileSelector());
    const { container } = render(<result.current.FileSelector />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const pngFile = new File(["x"], "test.png", { type: "image/png" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [pngFile] } });
    });
    await act(async () => {
      await Promise.resolve();
    });

    const entry = result.current.validFiles[0];
    const blob = new Blob(["y"], { type: "image/png" });

    act(() => {
      result.current.onIdChange(0, "", [{ ...entry, file: blob }]);
    });

    expect(() => {
      act(() => {
        result.current.onRemoveFile(0);
      });
    }).not.toThrow();
    expect(result.current.validFiles).toEqual([]);
  });

  it("onIdChange keeps url when renameFile returns a Blob", async () => {
    const { result } = renderHook(() => useFileSelector());
    const blob = new Blob(["x"], { type: "image/png" });
    const files = [{ id: "id", file: blob, url: "keep-url", type: ".png" }];

    act(() => {
      result.current.onIdChange(0, "", files);
    });

    expect(result.current.validFiles[0].url).toBe("keep-url");
  });

  it("drag enter, over, and leave toggle drag-active styling", async () => {
    const { result, rerender } = renderHook(() => useFileSelector());
    const renderSelector = () => <result.current.FileSelector dragActiveClassName="hook-drag-active" />;
    const { getByRole, rerender: rerenderDom } = render(renderSelector());
    const getButton = () => getByRole("button", { name: /Drag 'n' drop|Choose files/ });

    await act(async () => {
      fireEvent.dragEnter(getButton(), { preventDefault: jest.fn() });
    });
    rerender();
    rerenderDom(renderSelector());
    await waitFor(() => {
      expect(getButton()).toHaveClass("hook-drag-active");
    });

    await act(async () => {
      fireEvent.dragOver(getButton(), {
        preventDefault: jest.fn(),
        dataTransfer: { dropEffect: "", files: [] },
      });
      fireEvent.dragEnter(getButton(), { preventDefault: jest.fn() });
      fireEvent.dragLeave(getButton(), { preventDefault: jest.fn() });
    });
    rerender();
    rerenderDom(renderSelector());
    expect(getButton()).toHaveClass("hook-drag-active");

    await act(async () => {
      fireEvent.dragLeave(getButton(), { preventDefault: jest.fn() });
    });
    rerender();
    rerenderDom(renderSelector());
    await waitFor(() => {
      expect(getButton()).not.toHaveClass("hook-drag-active");
    });
  });

  it("ignores stale async batch when a newer upload supersedes it", async () => {
    let releaseFirst: (() => void) | undefined;
    const textSpy = jest.spyOn(File.prototype, "text").mockImplementation(function (this: File) {
      if (this.name === "slow.svg") {
        return new Promise<string>((resolve) => {
          releaseFirst = () => resolve("<svg><circle r='1'/></svg>");
        });
      }
      return Promise.resolve('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    });

    const { result } = renderHook(() => useFileSelector());
    const { container } = render(<result.current.FileSelector />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const slowSvg = new File(["<svg></svg>"], "slow.svg", { type: "image/svg+xml" });
    const fastPng = new File(["x"], "fast.png", { type: "image/png" });

    act(() => {
      fireEvent.change(input, { target: { files: [slowSvg] } });
    });

    act(() => {
      fireEvent.change(input, { target: { files: [fastPng] } });
    });

    await act(async () => {
      releaseFirst?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.validFiles.length).toBe(1);
    expect((result.current.validFiles[0].file as File).name).toBe("fast.png");

    textSpy.mockRestore();
  });

  it("onIdChange only updates the targeted index", () => {
    const { result } = renderHook(() => useFileSelector());
    const files = [
      { id: "first", file: new File(["a"], "first.png", { type: "image/png" }), url: "u1", type: ".png" },
      { id: "second", file: new File(["b"], "second.png", { type: "image/png" }), url: "u2", type: ".png" },
    ];

    act(() => {
      result.current.onIdChange(1, "renamed", files);
    });

    expect(result.current.validFiles[0].id).toBe("first");
    expect(result.current.validFiles[1].id).toBe("renamed");
  });

  it("adds only invalid files when batch has no valid files", async () => {
    const { result } = renderHook(() => useFileSelector());
    const { container } = render(<result.current.FileSelector />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(["x"], "only.txt", { type: "text/plain" })] } });
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.validFiles).toEqual([]);
    expect(result.current.invalidFiles).toHaveLength(1);
  });

  it("onIdChange assigns a new blob url when renaming a stored File", async () => {
    const { result } = renderHook(() => useFileSelector());
    const { container } = render(<result.current.FileSelector />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(["x"], "original.png", { type: "image/png" })] } });
    });
    await act(async () => {
      await Promise.resolve();
    });

    const previousUrl = result.current.validFiles[0].url;
    act(() => {
      result.current.onIdChange(0, "renamed-id", result.current.validFiles);
    });

    expect(result.current.validFiles[0].url).not.toBe(previousUrl);
  });

  it("onIdChange leaves non-target entries unchanged in a three-item list", () => {
    const { result } = renderHook(() => useFileSelector());
    const files = [
      { id: "one", file: new File(["a"], "one.png", { type: "image/png" }), url: "u1", type: ".png" },
      { id: "two", file: new File(["b"], "two.png", { type: "image/png" }), url: "u2", type: ".png" },
      { id: "three", file: new File(["c"], "three.png", { type: "image/png" }), url: "u3", type: ".png" },
    ];

    act(() => {
      result.current.onIdChange(1, "two-renamed", files);
    });

    expect(result.current.validFiles[0].id).toBe("one");
    expect(result.current.validFiles[1].id).toBe("two-renamed");
    expect(result.current.validFiles[2].id).toBe("three");
  });

  it("allows a batch sized exactly at maximumUploadCount", async () => {
    const { result } = renderHook(() => useFileSelector({ maximumUploadCount: 2 }));
    const { container } = render(<result.current.FileSelector />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, {
        target: {
          files: [new File(["a"], "a.png", { type: "image/png" }), new File(["b"], "b.png", { type: "image/png" })],
        },
      });
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.validFiles).toHaveLength(2);
    expect(result.current.maxUploadError.status).toBe(false);
  });

  it("skips re-setting max file size error when already in error state on oversize upload", async () => {
    const { result, rerender } = renderHook(() => useFileSelector({ maximumFileSize: 10 }));
    const renderSelector = () => <result.current.FileSelector />;
    const { container, rerender: rerenderDom } = render(renderSelector());
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    act(() => {
      result.current.setMaximumFileSizeExceeded(true, "existing error");
    });
    rerender();
    rerenderDom(renderSelector());

    const largeFile = new File([new ArrayBuffer(100)], "large.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [largeFile] } });
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.maxFileSizeError.status).toBe(true);
    expect(result.current.maxFileSizeError.message).toBe("existing error");
    expect(result.current.validFiles).toEqual([]);
  });
});

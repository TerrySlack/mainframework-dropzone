import {
  defaultTypeExtensions,
  maximumUploadCount,
  maximumFileSize,
  printableMaximumFileSize,
  isValidFileType,
  hasSurpassedMaxSize,
  checkFilesMaximumSize,
  createUrlString,
  clearBlobFromMemory,
  createUrlStringWithAutoCleanup,
  SvgXmlnsAttributeCheck,
  renameFile,
  checkFile,
} from "../../src/shared/utils/processUploadedFiles";

describe("processUploadedFiles", () => {
  describe("defaultTypeExtensions", () => {
    it("contains expected MIME type mappings", () => {
      expect(defaultTypeExtensions["image/png"]).toBe(".png");
      expect(defaultTypeExtensions["image/jpeg"]).toBe(".jpeg");
      expect(defaultTypeExtensions["application/pdf"]).toBe(".pdf");
    });
  });

  describe("constants", () => {
    it("maximumUploadCount is 30", () => {
      expect(maximumUploadCount).toBe(30);
    });
    it("maximumFileSize is 5MB", () => {
      expect(maximumFileSize).toBe(5e6);
    });
    it("printableMaximumFileSize is human readable", () => {
      expect(printableMaximumFileSize).toBe("5 Megabytes");
    });
  });

  describe("isValidFileType", () => {
    it("returns true for accepted file types", () => {
      const pngFile = new File([], "test.png", { type: "image/png" });
      expect(isValidFileType(pngFile)).toBe(true);
    });

    it("returns false for non-accepted file types", () => {
      const txtFile = new File([], "test.txt", { type: "text/plain" });
      expect(isValidFileType(txtFile)).toBe(false);
    });

    it("accepts custom type map", () => {
      const customTypes = { "text/plain": ".txt" };
      const txtFile = new File([], "test.txt", { type: "text/plain" });
      expect(isValidFileType(txtFile, customTypes)).toBe(true);
    });
  });

  describe("hasSurpassedMaxSize", () => {
    it("returns true when file exceeds max size", () => {
      const largeBlob = new Blob([new ArrayBuffer(10_000_000)], { type: "application/octet-stream" });
      expect(hasSurpassedMaxSize(largeBlob, 1000)).toBe(true);
    });

    it("returns false when file is within limit", () => {
      const smallBlob = new Blob(["x"], { type: "text/plain" });
      expect(hasSurpassedMaxSize(smallBlob, 1000)).toBe(false);
    });
  });

  describe("checkFilesMaximumSize", () => {
    it("returns true when any file exceeds max size", () => {
      const smallFile = new File(["a"], "a.png", { type: "image/png" });
      const largeFile = new File([new ArrayBuffer(10_000_000)], "large.png", { type: "image/png" });
      expect(checkFilesMaximumSize([smallFile, largeFile], 1000)).toBe(true);
    });

    it("returns false when all files are within limit", () => {
      const smallFile1 = new File(["a"], "a.png", { type: "image/png" });
      const smallFile2 = new File(["b"], "b.png", { type: "image/png" });
      expect(checkFilesMaximumSize([smallFile1, smallFile2], 1000)).toBe(false);
    });

    it("returns false for empty array", () => {
      expect(checkFilesMaximumSize([], 1000)).toBe(false);
    });
  });

  describe("createUrlString and clearBlobFromMemory", () => {
    it("creates blob URL for file", () => {
      const file = new File(["content"], "test.png", { type: "image/png" });
      const url = createUrlString(file);
      expect(url).toMatch(/^blob:/);
    });

    it("returns same URL for same file (caching)", () => {
      const file = new File(["content"], "test.png", { type: "image/png" });
      const url1 = createUrlString(file);
      const url2 = createUrlString(file);
      expect(url1).toBe(url2);
    });

    it("clears blob from memory", () => {
      const file = new File(["content"], "test.png", { type: "image/png" });
      const url = createUrlString(file);
      clearBlobFromMemory(file);
      expect(() => URL.revokeObjectURL(url)).not.toThrow();
    });
  });

  describe("createUrlStringWithAutoCleanup", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it("returns url and cancel function", () => {
      const file = new File(["content"], "test.png", { type: "image/png" });
      const result = createUrlStringWithAutoCleanup(file, 1000);
      expect(result.url).toMatch(/^blob:/);
      expect(typeof result.cancel).toBe("function");
    });

    it("cancel revokes the URL and prevents auto-cleanup", () => {
      const file = new File(["content"], "test.png", { type: "image/png" });
      const result = createUrlStringWithAutoCleanup(file, 1000);
      result.cancel();
      jest.runAllTimers();
      expect(result.url).toMatch(/^blob:/);
    });
  });

  describe("SvgXmlnsAttributeCheck", () => {
    it("returns document data for non-SVG files", async () => {
      const pngFile = new File(["fake-png"], "test.png", { type: "image/png" });
      const result = await SvgXmlnsAttributeCheck(pngFile);
      expect(result).not.toBeNull();
      expect(result!.id).toBe("test");
      expect(result!.type).toBe(".png");
      expect(result!.url).toMatch(/^blob:/);
      expect(result!.file).toBe(pngFile);
    });

    it("returns document data for SVG with xmlns", async () => {
      const svgWithXmlns = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>';
      const svgFile = new File([svgWithXmlns], "test.svg", { type: "image/svg+xml" });
      const result = await SvgXmlnsAttributeCheck(svgFile);
      expect(result).not.toBeNull();
      expect(result!.id).toBe("test");
      expect(result!.type).toBe(".svg");
    });

    it("adds xmlns to SVG without it", async () => {
      const svgWithoutXmlns = "<svg><circle r='5'/></svg>";
      const svgFile = new File([svgWithoutXmlns], "test.svg", { type: "image/svg+xml" });
      const result = await SvgXmlnsAttributeCheck(svgFile);
      expect(result).not.toBeNull();
      expect(result!.file).toBeInstanceOf(File);
      const modifiedFile = result!.file as File;
      const content = await modifiedFile.text();
      expect(content).toContain("xmlns=");
    });

    it("returns null for unsupported file type in custom types", async () => {
      const customTypes = { "image/png": ".png" } as Record<string, string>;
      const svgFile = new File(["<svg xmlns='http://www.w3.org/2000/svg'/>"], "test.svg", { type: "image/svg+xml" });
      const result = await SvgXmlnsAttributeCheck(svgFile, customTypes);
      expect(result).toBeNull();
    });
  });

  describe("renameFile", () => {
    it("creates new File with new name when different", () => {
      const blob = new Blob(["x"], { type: "text/plain" });
      const result = renameFile(blob, "newname.txt");
      expect(result).toBeInstanceOf(File);
      expect(result.name).toBe("newname.txt");
    });

    it("returns same File when name already matches", () => {
      const file = new File(["x"], "same.txt", { type: "text/plain" });
      const result = renameFile(file, "same.txt");
      expect(result).toBe(file);
    });
  });

  describe("checkFile", () => {
    it("returns file as-is when id is empty", () => {
      const file = new File(["x"], "test.png", { type: "image/png" });
      expect(checkFile("", file)).toBe(file);
    });

    it("renames File when id differs from filename (without extension)", () => {
      const file = new File(["x"], "old.png", { type: "image/png" });
      const result = checkFile("new", file);
      expect(result).toBeInstanceOf(File);
      expect((result as File).name).toBe("new");
    });

    it("returns same File when id matches filename without extension", () => {
      const file = new File(["x"], "myname.png", { type: "image/png" });
      const result = checkFile("myname", file);
      expect(result).toBe(file);
    });

    it("converts Blob to File with id when file is Blob", () => {
      const blob = new Blob(["x"], { type: "text/plain" });
      const result = checkFile("myid", blob);
      expect(result).toBeInstanceOf(File);
      expect((result as File).name).toBe("myid");
    });
  });
});

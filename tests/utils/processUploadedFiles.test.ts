/// <reference types="jest" />
import {
  defaultTypeExtensions,
  maximumUploadCount,
  maximumFileSize,
  isValidFileType,
  hasSurpassedMaxSize,
  checkFilesMaximumSize,
  createUrlString,
  clearBlobFromMemory,
  createUrlStringWithClear,
  svgXmlnsAttributeCheck,
  renameFile,
  buildAcceptString,
  formatFileSize,
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

    it("accepts .jpg by extension", () => {
      const jpgFile = new File([], "photo.jpg", { type: "" });
      expect(isValidFileType(jpgFile)).toBe(true);
    });
  });

  describe("extension-only createDocumentData via svgXmlnsAttributeCheck", () => {
    it("accepts png by extension when type is empty", async () => {
      const pngFile = new File(["x"], "test.png", { type: "" });
      const result = await svgXmlnsAttributeCheck(pngFile);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(".png");
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

    it("does not throw when called on an unregistered file", () => {
      const file = new File([], "unregistered.png", { type: "image/png" });
      expect(() => clearBlobFromMemory(file)).not.toThrow();
    });
  });

  describe("createUrlStringWithClear", () => {
    it("returns url and clear function", () => {
      const file = new File(["content"], "test.png", { type: "image/png" });
      const result = createUrlStringWithClear(file);

      expect(result.url).toMatch(/^blob:/);
      expect(typeof result.clear).toBe("function");

      result.clear();
    });
  });

  describe("SvgXmlnsAttributeCheck", () => {
    it("returns document data for non-SVG files", async () => {
      const pngFile = new File(["fake-png"], "test.png", { type: "image/png" });
      const result = await svgXmlnsAttributeCheck(pngFile);
      expect(result).not.toBeNull();
      expect(result!.id).toBe("test");
      expect(result!.type).toBe(".png");
      expect(result!.url).toMatch(/^blob:/);
      expect(result!.file).toBe(pngFile);
    });

    it("returns document data for SVG with xmlns", async () => {
      const svgWithXmlns = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>';
      const svgFile = new File([svgWithXmlns], "test.svg", { type: "image/svg+xml" });
      const result = await svgXmlnsAttributeCheck(svgFile);
      expect(result).not.toBeNull();
      expect(result!.id).toBe("test");
      expect(result!.type).toBe(".svg");
    });

    it("adds xmlns to SVG without it", async () => {
      const svgWithoutXmlns = "<svg><circle r='5'/></svg>";
      const svgFile = new File([svgWithoutXmlns], "test.svg", { type: "image/svg+xml" });
      const result = await svgXmlnsAttributeCheck(svgFile);
      expect(result).not.toBeNull();
      expect(result!.file).toBeInstanceOf(File);
      const modifiedFile = result!.file as File;
      const content = await modifiedFile.text();
      expect(content).toContain("xmlns=");
    });

    it("returns null for unsupported file type in custom types", async () => {
      const customTypes = { "image/png": ".png" } as Record<string, string>;
      const svgFile = new File(["<svg xmlns='http://www.w3.org/2000/svg'/>"], "test.svg", { type: "image/svg+xml" });
      const result = await svgXmlnsAttributeCheck(svgFile, customTypes);
      expect(result).toBeNull();
    });

    it("does not inject xmlns when it appears only after first 2KB", async () => {
      const padding = "a".repeat(2048);
      const svgWithXmlns = `${padding}<svg xmlns="http://www.w3.org/2000/svg"></svg>`;
      const svgFile = new File([svgWithXmlns], "test.svg", { type: "image/svg+xml" });
      const result = await svgXmlnsAttributeCheck(svgFile);
      expect(result).not.toBeNull();
      expect(result!.file).toBe(svgFile);
    });

    it("adds xmlns to SVG with uppercase <SVG> tag", async () => {
      const svgUppercase = "<SVG><circle r='5'/></SVG>";
      const svgFile = new File([svgUppercase], "test.svg", { type: "image/svg+xml" });
      const result = await svgXmlnsAttributeCheck(svgFile);
      expect(result).not.toBeNull();
      expect(result!.file).toBeInstanceOf(File);
      const content = await (result!.file as File).text();
      expect(content).toContain("xmlns=");
    });
  });

  describe("renameFile", () => {
    it("creates new File with new name when different", () => {
      const blob = new Blob(["x"], { type: "text/plain" });
      const result = renameFile("newname.txt", blob);
      expect(result).toBeInstanceOf(File);
      expect((result as File).name).toBe("newname.txt");
    });

    it("returns same File when name already matches", () => {
      const file = new File(["x"], "same.txt", { type: "text/plain" });
      const result = renameFile("same", file);
      expect(result).toBe(file);
    });
  });

  describe("renameFile", () => {
    it("returns file as-is when id is empty", () => {
      const file = new File(["x"], "test.png", { type: "image/png" });
      expect(renameFile("", file)).toBe(file);
    });

    it("renames File when id differs from filename (without extension)", () => {
      const file = new File(["x"], "old.png", { type: "image/png" });
      const result = renameFile("new", file);
      expect(result).toBeInstanceOf(File);
      expect((result as File).name).toBe("new.png");
    });

    it("returns same File when id matches filename without extension", () => {
      const file = new File(["x"], "myname.png", { type: "image/png" });
      const result = renameFile("myname", file);
      expect(result).toBe(file);
    });

    it("converts Blob to File with id when file is Blob", () => {
      const blob = new Blob(["x"], { type: "text/plain" });
      const result = renameFile("myid", blob);
      expect(result).toBeInstanceOf(File);
      expect((result as File).name).toBe("myid");
    });

    it("returns same File when filename has no extension and id matches", () => {
      const file = new File(["x"], "README", { type: "text/plain" });
      const result = renameFile("README", file);
      expect(result).toBe(file);
    });
  });

  describe("buildAcceptString", () => {
    it("adds a leading dot when extension omits it", () => {
      const accept = buildAcceptString({ "image/png": "png" });
      expect(accept).toContain(".png");
      expect(accept).toContain("image/png");
    });

    it("skips empty extension values and deduplicates", () => {
      const accept = buildAcceptString({ "image/png": "  ", "image/jpeg": ".jpeg", "image/jpg": "jpeg" });
      expect(accept).toContain(".jpeg");
      expect(accept).toContain("image/jpg");
      expect(accept.split(", ").filter((part: string) => part === ".jpeg").length).toBe(1);
    });
  });

  describe("formatFileSize", () => {
    it("formats bytes, kilobytes, megabytes, and gigabytes", () => {
      expect(formatFileSize(500)).toBe("500 Bytes");
      expect(formatFileSize(1500)).toBe("2 Kilobytes");
      expect(formatFileSize(2e6)).toBe("2 Megabytes");
      expect(formatFileSize(2e9)).toBe("2 Gigabytes");
    });
  });

  describe("isValidFileType extensionListLower", () => {
    it("uses the provided extension list", () => {
      const customTypes = { "application/x-custom": ".custom" };
      const file = new File([], "file.custom", { type: "" });
      expect(isValidFileType(file, customTypes, [".custom"])).toBe(true);
    });

    it("builds extension list from custom acceptedTypes when extensionListLower omitted", () => {
      const customTypes = { "text/plain": ".txt" };
      const file = new File([], "notes.txt", { type: "" });
      expect(isValidFileType(file, customTypes)).toBe(true);
    });
  });

  describe("renameFile edge cases", () => {
    it("uses default extension from type when filename has no extension", () => {
      const file = new File(["x"], "photo", { type: "image/png" });
      const result = renameFile("newid", file);
      expect((result as File).name).toBe("newid.png");
    });

    it("preserves multi-dot basename in id", async () => {
      const pngFile = new File(["x"], "my.photo.final.png", { type: "image/png" });
      const result = await svgXmlnsAttributeCheck(pngFile);
      expect(result?.id).toBe("my.photo.final");
    });
  });

  describe("additional branch coverage", () => {
    it("buildAcceptString deduplicates extension without dot when already present", () => {
      const accept = buildAcceptString({ "image/png": "png", "image/x": "png" });
      expect(accept.split(", ").filter((part: string) => part === ".png").length).toBe(1);
    });

    it("buildAcceptString skips blank MIME keys in the MIME loop", () => {
      const accept = buildAcceptString({ "   ": ".png", "image/png": ".png" });
      expect(accept).toContain(".png");
      expect(accept).toContain("image/png");
    });

    it("returns null when extension is not in allowable types", async () => {
      const customTypes = { "image/png": ".png" };
      const file = new File([], "notes.doc", { type: "" });
      const result = await svgXmlnsAttributeCheck(file, customTypes);
      expect(result).toBeNull();
    });

    it("renameFile converts a Blob when an id is provided", () => {
      const blob = new Blob(["data"], { type: "application/pdf" });
      const result = renameFile("report.pdf", blob);
      expect(result).toBeInstanceOf(File);
      expect((result as File).name).toBe("report.pdf");
    });

    it("buildAcceptString skips duplicate dotted extensions", () => {
      const accept = buildAcceptString({ "image/png": ".png", "image/jpeg": ".png" });
      expect(accept.split(", ").filter((part: string) => part === ".png").length).toBe(1);
    });

    it("buildAcceptString does not duplicate MIME keys already collected", () => {
      const accept = buildAcceptString({ "image/png": "png", "image/jpeg": ".jpeg" });
      expect(accept.split(", ").filter((part: string) => part === "image/png").length).toBe(1);
    });

    it("returns null when extension matches list but not allowable type values", async () => {
      const file = new File([], "file.doc", { type: "" });
      const result = await svgXmlnsAttributeCheck(file, { "image/png": ".png" }, [".doc"]);
      expect(result).toBeNull();
    });

    it("rename returns the same File when the target name already matches", () => {
      const file = new File(["x"], "already.txt", { type: "text/plain" });
      const result = renameFile("already", file);
      expect(result).toBe(file);
    });

    it("hasSurpassedMaxSize uses default maximumFileSize", () => {
      expect(hasSurpassedMaxSize(new Blob(["x"]))).toBe(false);
    });

    it("checkFilesMaximumSize uses default maximumFileSize", () => {
      const file = new File(["x"], "a.png", { type: "image/png" });
      expect(checkFilesMaximumSize([file])).toBe(false);
    });

    it("buildAcceptString keeps dotted extensions and MIME keys", () => {
      expect(buildAcceptString({ "image/png": ".png" })).toBe(".png, image/png");
    });

    it("createUrlStringWithClear clear revokes the blob url", () => {
      const file = new File(["content"], "test.png", { type: "image/png" });
      const { clear } = createUrlStringWithClear(file);
      clear();
      expect(() => clear()).not.toThrow();
    });

    it("renameFile returns blob when id is empty", () => {
      const blob = new Blob(["x"], { type: "text/plain" });
      expect(renameFile("", blob)).toBe(blob);
    });

    it("isValidFileType matches MIME type key", () => {
      const file = new File([], "any.bin", { type: "application/pdf" });
      expect(isValidFileType(file)).toBe(true);
    });
  });
});

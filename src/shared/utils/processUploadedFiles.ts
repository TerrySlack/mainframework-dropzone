"use client";
//Use this to quickly get the file extensions
//Devs can pass their own custom type mappings to override these defaults

export const defaultTypeExtensions: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpeg",
  "image/jpg": ".jpg",
  "image/svg+xml": ".svg",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

//This is the attribute that should be present in all svg files
const xmlns = "<svg xmlns='http://www.w3.org/2000/svg'";

export const maximumUploadCount = 30;
export const maximumFileSize = 5e6; //5 mb's
export const printableMaximumFileSize = "5 Megabytes";

// TYPE DEFINITIONS

type TypeExtensions = Readonly<Record<string, string>>;

// HELPER: Extract file ID (filename without extension)

/*
 * Extracts filename without extension, handling multiple dots correctly.
 * "my.photo.final.png" -> "my.photo.final"
 * "README.md" -> "README"
 * "no-extension" -> "no-extension"
 */
const getFileId = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
};

// BLOB URL REGISTRY - WeakMap for automatic GC cleanup

/*
 * WeakMap prevents memory leaks by allowing GC to reclaim File objects.
 * No manual cleanup needed when Files are no longer referenced.
 */
const blobUrlRegistry = new WeakMap<File, string>();

export const createUrlString = (file: File): string => {
  const existing = blobUrlRegistry.get(file);
  if (existing) return existing;

  const url = URL.createObjectURL(file);
  blobUrlRegistry.set(file, url);
  return url;
};

export const clearBlobFromMemory = (file: File): void => {
  const url = blobUrlRegistry.get(file);
  if (!url) return;

  URL.revokeObjectURL(url);
  blobUrlRegistry.delete(file);
};

/*
 * Creates a blob URL with automatic cleanup after specified duration.
 * Returns object with url and cancel function for lifecycle control.
 *
 * @param file - The file to create a URL for
 * @param autoCleanupMs - Milliseconds before auto-cleanup (default: 5 minutes)
 * @returns Object with url and cancel function
 */
export const createUrlStringWithAutoCleanup = (file: File, autoCleanupMs = 300_000) => {
  const url = createUrlString(file);
  const timer = setTimeout(() => {
    clearBlobFromMemory(file);
  }, autoCleanupMs);

  return {
    url,
    cancel: () => {
      clearTimeout(timer);
      clearBlobFromMemory(file);
    },
  };
};

// VALIDATION FUNCTIONS

/*
 * Checks if file type is in accepted types map.
 * Uses 'in' operator for better performance than Boolean() conversion.
 */
export const isValidFileType = (file: File, acceptedTypes: TypeExtensions = defaultTypeExtensions): boolean =>
  file.type in acceptedTypes;

export const hasSurpassedMaxSize = (file: File | Blob, maxSize = maximumFileSize): boolean => file.size > maxSize;

/*
 * Returns true if ANY file exceeds the maximum size limit.
 * Optimized with for-loop to avoid callback allocations in hot path.
 */

export const checkFilesMaximumSize = (files: readonly (File | Blob)[], max = maximumFileSize): boolean => {
  let i = 0;
  while (i < files.length) {
    if (files[i].size > max) return true;
    i++;
  }
  return false;
};

// DOCUMENT CREATION

/*
 * Creates document data object with file metadata.
 * Returns null if file type is not in allowableTypes to prevent invalid state.
 */
const createDocumentData = (file: File, allowableTypes: TypeExtensions = defaultTypeExtensions) => {
  const type = allowableTypes[file.type];
  if (!type) return null;

  return {
    id: getFileId(file.name),
    type,
    file,
    url: createUrlString(file),
  };
};

/*
 * Optimized SVG xmlns check - only reads first 2KB initially.
 * Avoids toLowerCase() allocation and uses safer regex for replacement.
 */
export const SvgXmlnsAttributeCheck = async (file: File, allowableTypes: TypeExtensions = defaultTypeExtensions) => {
  if (file.type !== "image/svg+xml") {
    return createDocumentData(file, allowableTypes);
  }

  // OPTIMIZATION: Only read first 2KB to check for xmlns
  const chunk = file.slice(0, 2048);
  const text = await chunk.text();

  // No toLowerCase() needed - xmlns attribute is case-sensitive in XML
  if (text.includes("xmlns=")) {
    return createDocumentData(file, allowableTypes);
  }

  // Missing the xmlns attribute, add it
  // Need full file content for modification
  const fullText = await file.text();

  // SAFER: Use regex with word boundary instead of simple string replace
  // Handles <svg> without space and various attribute orders
  const svgWithXmlns = fullText.replace(/<svg\b/, xmlns);

  return createDocumentData(
    new File([svgWithXmlns], file.name, {
      type: file.type,
    }),
    allowableTypes,
  );
};

// FILE RENAMING

/*
 * Renames a file or blob. Optimized to avoid unnecessary File creation
 * if name already matches.
 */
export const renameFile = (file: Blob, name: string): File =>
  file instanceof File && file.name === name ? file : new File([file], name, { type: file.type });

/*
 * Checks if file needs renaming based on ID comparison.
 * - Handles Blobs (no name) by converting to File
 * - Avoids repeated string operations
 * - Case-sensitive comparison
 */
export const checkFile = (id: string, file: File | Blob): File | Blob => {
  // No ID provided, return as-is
  if (!id) return file;

  // Handle Blob (not a File subclass)
  if (!(file instanceof File)) {
    return renameFile(file, id);
  }

  // It's a File - check if renaming is needed
  const currentId = getFileId(file.name);
  return id === currentId ? file : renameFile(file, id);
};

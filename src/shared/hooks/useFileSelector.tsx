import { useRef, useState, useCallback, useMemo } from "react";
import type { DragEvent, ChangeEvent } from "react";
import type { ErrorMessage, FileData, FileSelectorViewProps, IFileUploaderProps } from "../types/types";
import {
  buildAcceptString,
  defaultTypeExtensions,
  maximumUploadCount as maxUploadCount,
  maximumFileSize as maxFileSize,
  formatFileSize,
  checkFilesMaximumSize,
  isValidFileType,
  svgXmlnsAttributeCheck,
  clearBlobFromMemory,
  createUrlString,
  renameFile,
} from "../utils/processUploadedFiles";

import { FileSelector } from "../components/FileSelector";

const defaultFileProcessingErrorMessage = "One or more files could not be processed. Please try again.";

export const useFileSelector = ({
  maximumUploadCount = maxUploadCount,
  maximumFileSize = maxFileSize,
  acceptedTypes = defaultTypeExtensions,
  allowMultiple = true,
}: IFileUploaderProps = {}) => {
  const [validFiles, setValidFiles] = useState<FileData[]>([]);
  const [invalidFiles, setInvalidFiles] = useState<File[]>([]);
  const [maxUploadError, setMaxUploadError] = useState<ErrorMessage>({
    status: false,
    message: "",
  });
  const [maxFileSizeError, setMaxFileSizeError] = useState<ErrorMessage>({
    status: false,
    message: "",
  });
  const [isDragActive, setIsDragActive] = useState(false);

  const dragDepthRef = useRef(0);
  const callIdRef = useRef(0);
  const extensionListRef = useRef(Object.values(acceptedTypes).map((e) => e.toLowerCase()));
  const acceptRef = useRef(buildAcceptString(acceptedTypes));

  const setMaximumUploadsExceeded = useCallback((status = false, fileCount?: number, maximumUploads?: number) => {
    setMaxUploadError({
      status,
      message: status
        ? `You have attempted to upload ${fileCount} files. The maximum allowable uploads for this feature is ${maximumUploads}`
        : "",
    });
  }, []);

  const setMaximumFileSizeExceeded = useCallback(
    (status = false, message?: string) => {
      setMaxFileSizeError({
        status,
        message: status
          ? (message ??
            `You have attempted to upload a file(s) that exceeds the maximum size of ${formatFileSize(maximumFileSize)}`)
          : "",
      });
    },
    [maximumFileSize],
  );

  const clearBlobs = useCallback(() => {
    let i = 0;
    while (i < validFiles.length) {
      const file = validFiles[i].file;
      if (file instanceof File) {
        clearBlobFromMemory(file);
      }
      i++;
    }
  }, [validFiles]);

  const clearCache = useCallback(() => {
    clearBlobs();
    setInvalidFiles([]);
    setValidFiles([]);
    setMaximumUploadsExceeded(false);
    setMaximumFileSizeExceeded(false);
  }, [clearBlobs, setMaximumUploadsExceeded, setMaximumFileSizeExceeded]);

  const onCancel = useCallback(() => {
    clearCache();
  }, [clearCache]);

  const getValidFileStreams = useCallback(
    () => (validFiles.length ? validFiles.map(({ file }: FileData) => file) : []),
    [validFiles],
  );

  const processFiles = useCallback(
    (files: File[]) => {
      const callId = ++callIdRef.current;
      const maxFileSizeCheck = checkFilesMaximumSize(files, maximumFileSize);
      const extensionListLower = extensionListRef.current;

      if (maxFileSizeCheck) {
        clearBlobs();
        if (!maxFileSizeError.status) {
          setMaximumFileSizeExceeded(true);
        }
        setValidFiles([]);
        setInvalidFiles([]);
      } else {
        const valid: { file: File; promise: Promise<FileData | null> }[] = [];
        const invalid: File[] = [];

        let i = 0;
        while (i < files.length) {
          const file = files[i];
          if (isValidFileType(file, acceptedTypes, extensionListLower)) {
            valid.push({
              file,
              promise: svgXmlnsAttributeCheck(file, acceptedTypes, extensionListLower),
            });
          } else {
            invalid.push(file);
          }
          i++;
        }

        if (valid.length > 0) {
          Promise.all(valid.map((v) => v.promise))
            .then((results) => {
              if (callId !== callIdRef.current) return;
              const filteredResults: FileData[] = [];
              const nullFiles: File[] = [];
              let j = 0;
              while (j < results.length) {
                const result = results[j];
                if (result !== null) {
                  filteredResults.push(result);
                } else {
                  nullFiles.push(valid[j].file);
                }
                j++;
              }
              const batchInvalid = invalid.concat(nullFiles);
              if (batchInvalid.length > 0) {
                setInvalidFiles((state) => state.concat(batchInvalid));
              }
              setValidFiles((current) => {
                if (current.length + filteredResults.length > maximumUploadCount) {
                  setMaximumUploadsExceeded(true, current.length + filteredResults.length, maximumUploadCount);
                  return current;
                }
                return current.concat(filteredResults);
              });
            })
            .catch(() => {
              setMaximumFileSizeExceeded(true, defaultFileProcessingErrorMessage);
              setInvalidFiles((state) => state.concat(valid.map((v) => v.file)));
            });
        } else if (invalid.length > 0) {
          setInvalidFiles((state) => state.concat(invalid));
        }
      }
    },
    [
      acceptedTypes,
      clearBlobs,
      maximumFileSize,
      maximumUploadCount,
      maxFileSizeError.status,
      setMaximumFileSizeExceeded,
      setMaximumUploadsExceeded,
    ],
  );

  const onRemoveFile = useCallback(
    (index: number) => {
      const updatedValidFiles: FileData[] = [];
      let i = 0;
      while (i < validFiles.length) {
        if (i === index) {
          const file = validFiles[i].file;
          if (file instanceof File) {
            clearBlobFromMemory(file);
          }
        } else {
          updatedValidFiles.push(validFiles[i]);
        }
        i++;
      }
      setValidFiles(updatedValidFiles);
    },
    [validFiles],
  );

  const onIdChange = useCallback((index: number, id: string, files: FileData[]) => {
    const updatedValidFiles = files.map((fileData: FileData, i: number) => {
      if (i === index) {
        if (fileData.file instanceof File) clearBlobFromMemory(fileData.file);
        const renamedFile = renameFile(id, fileData.file);
        const newUrl = renamedFile instanceof File ? createUrlString(renamedFile) : fileData.url;
        return { ...fileData, file: renamedFile, id, url: newUrl };
      }
      return fileData;
    });
    setValidFiles(updatedValidFiles);
  }, []);

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      processFiles(files);
      event.target.value = "";
    },
    [processFiles],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDragActive(false);
      processFiles(Array.from(e.dataTransfer.files));
    },
    [processFiles],
  );

  const onDragOver = useCallback((e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDragEnter = useCallback((e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dragDepthRef.current++;
    if (dragDepthRef.current === 1) {
      setIsDragActive(true);
    }
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  }, []);

  const FileSelectorWrapper = useMemo(() => {
    const Component = ({
      inputId,
      messageParagraph,
      inputClassName,
      clickableAreaClassName,
      dropZoneWrapperClassName,
      messageParagraphClassName,
      ariaLabel,
      ariaDescribedBy,
      ariaLabelButton,
      dragActiveClassName,
      disabled,
    }: FileSelectorViewProps) => (
      <FileSelector
        inputId={inputId}
        messageParagraph={messageParagraph}
        inputClassName={inputClassName}
        clickableAreaClassName={clickableAreaClassName}
        dropZoneWrapperClassName={dropZoneWrapperClassName}
        messageParagraphClassName={messageParagraphClassName}
        ariaLabel={ariaLabel}
        ariaDescribedBy={ariaDescribedBy}
        ariaLabelButton={ariaLabelButton}
        dragActiveClassName={dragActiveClassName}
        disabled={disabled}
        isDragActive={isDragActive}
        multiple={allowMultiple}
        onChange={onInputChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        accept={acceptRef.current}
      />
    );
    Component.displayName = "FileSelectorWrapper";
    return Component;
  }, [allowMultiple, isDragActive, onDragEnter, onDragLeave, onDragOver, onDrop, onInputChange]);

  return {
    validFiles,
    invalidFiles,
    clearCache,
    getValidFileStreams,
    onCancel,
    onIdChange,
    onRemoveFile,
    clearBlobs,
    clearBlob: clearBlobFromMemory,
    maxUploadError,
    maxFileSizeError,
    setMaximumFileSizeExceeded,
    setMaximumUploadsExceeded,
    FileSelector: FileSelectorWrapper,
  };
};

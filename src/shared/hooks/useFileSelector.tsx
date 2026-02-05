import { useCallback, useRef, useState, DragEvent, ChangeEvent, useMemo } from "react";
import { ErrorMessage, FileData, FileSelectorProps, IFileUploaderProps } from "../types/types";
import {
  defaultTypeExtensions,
  maximumUploadCount as maxUploadCount,
  maximumFileSize as maxFileSize,
  printableMaximumFileSize,
  checkFilesMaximumSize,
  isValidFileType,
  SvgXmlnsAttributeCheck,
  checkFile,
  clearBlobFromMemory,
} from "../utils/processUploadedFiles";

import { useCustomCallback } from "./useCustomCallback";
import { FileSelector } from "../components/FileSelector";

export const useFileSelector = ({
  maximumUploadCount = maxUploadCount,
  maximumFileSize = maxFileSize,
  acceptedTypes = defaultTypeExtensions,
}: IFileUploaderProps = {}) => {
  //State
  //Trigger a re-render
  const [, setUpdateTrigger] = useState<number>(0);
  const [validFiles, SetValidFiles] = useState<FileData[]>([]);
  const [invalidFiles, SetInvalidFiles] = useState<File[]>([]);

  //Refs
  const maxUploadErrorRef = useRef<ErrorMessage>({
    status: false,
    message: "",
  });
  const maxFileSizeErrorRef = useRef<ErrorMessage>({
    status: false,
    message: "",
  });

  const setMaximumUploadsExceeded = useCallback((status = false, fileCount?: number, maximumUploads?: number) => {
    maxUploadErrorRef.current.status = status;
    maxUploadErrorRef.current.message = status
      ? `You have attempted to upload ${fileCount} files. The maximum allowable uploads for this feature is ${maximumUploads}`
      : "";
    setUpdateTrigger((state) => (state += 1));
  }, []);

  const setMaximumFileSizeExceeded = useCallback((status = false) => {
    maxFileSizeErrorRef.current.status = status;
    maxFileSizeErrorRef.current.message = status
      ? `You have attempted upload a file(s) that exceeds the maximum size of ${printableMaximumFileSize}`
      : "";
    setUpdateTrigger((state) => (state += 1));
  }, []);

  const clearBlobs = useCustomCallback(() => {
    //Remove any blobs created in memory
    let i = 0;
    while (i < validFiles.length) {
      const file = validFiles[i].file;
      if (file instanceof File) {
        clearBlobFromMemory(file);
      }
      i++;
    }
  }, [validFiles]);

  const clearCache = useCustomCallback(() => {
    //Clear any blobs held in memory
    clearBlobs();
    SetInvalidFiles([]);
    SetValidFiles([]);
  }, [clearBlobs]);

  const onCancel = useCustomCallback(() => {
    clearCache();
  }, [clearCache]);

  const getValidFileStreams = useCallback(
    () => (validFiles.length ? validFiles.map(({ file }: FileData) => file) : []),
    [validFiles],
  );

  //Main Engine to deal with files
  const processFiles = useCustomCallback(
    (files: File[]) => {
      const maxFileSizeCheck = checkFilesMaximumSize(files, maximumFileSize) && !maxFileSizeErrorRef.current.status;

      const maxUploadCountCheck =
        typeof maximumUploadCount !== "undefined"
          ? !maxUploadErrorRef.current.status && files.length > maximumUploadCount
          : false;

      if (maxFileSizeCheck || maxUploadCountCheck) {
        if (maxFileSizeCheck) setMaximumFileSizeExceeded(true);
        if (maxUploadCountCheck) setMaximumUploadsExceeded(true, files.length, maximumUploadCount);

        onCancel();
      } else {
        const valid: Promise<FileData | null>[] = [];
        const invalid: File[] = [];

        let i = 0;
        while (i < files.length) {
          const file = files[i];
          if (isValidFileType(file, acceptedTypes)) {
            valid.push(SvgXmlnsAttributeCheck(file, acceptedTypes));
          } else {
            invalid.push(file);
          }
          i++;
        }

        if (valid.length > 0) {
          Promise.all(valid)
            .then((results) => {
              const filteredResults: FileData[] = [];
              let j = 0;
              while (j < results.length) {
                const result = results[j];
                if (result !== null) {
                  filteredResults.push(result);
                }
                j++;
              }
              SetValidFiles(filteredResults);
            })
            .catch((error) => {
              console.error("File processing error:", error);
              // Optionally expose error state to engineers
              SetInvalidFiles(invalid.concat(files)); // Treat all as invalid on error
            });
        }

        if (invalid.length > 0) {
          SetInvalidFiles(invalid);
        }
      }
    },
    [
      acceptedTypes,
      maximumFileSize,
      maximumUploadCount,
      setMaximumFileSizeExceeded,
      setMaximumUploadsExceeded,
      onCancel,
    ],
  );

  const onRemoveFile = useCustomCallback(
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
      SetValidFiles(updatedValidFiles);
    },
    [validFiles],
  );

  const onIdChange = useCallback((index: number, id: string, files: FileData[]) => {
    const updatedValidFiles = files.map((fileData: FileData, i: number) => {
      if (i === index) {
        const renamedFile = checkFile(id, fileData.file);
        return { ...fileData, file: renamedFile, id };
      }
      return fileData;
    });
    SetValidFiles(updatedValidFiles);
  }, []);

  const onInputChange = useCustomCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      processFiles(files);
    },
    [processFiles],
  );

  //Drag and Drop

  const onDrop = useCustomCallback(
    (e: DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
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
    const { classList } = e.currentTarget;
    classList.add("border-yellow-400");
    classList.remove("border-silver-600");
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const currentTarget = e.currentTarget;

    const timeoutId = setTimeout(() => {
      if (currentTarget && !currentTarget.contains(e.relatedTarget as Node)) {
        const { classList } = currentTarget;
        classList.remove("border-yellow-400");
        classList.add("border-silver-600");
      }
      clearTimeout(timeoutId);
    }, 200);
  }, []);

  // const FileSelectorRef = useRef(() => (
  //   <FileSelector
  //     acceptTypes={acceptTypes}
  //     onChange={onInputChange}
  //     onDragOver={onDragOver}
  //     onDrop={onDrop}
  //     onDragEnter={onDragEnter}
  //     onDragLeave={onDragLeave}
  //   />
  // ));
  // In useFileSelector.ts, create a wrapper component
  const createFileSelectorComponent = (handlers: {
    onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onDragOver: (e: DragEvent<HTMLButtonElement>) => void;
    onDrop: (e: DragEvent<HTMLButtonElement>) => void;
    onDragEnter: (e: DragEvent<HTMLButtonElement>) => void;
    onDragLeave: (e: DragEvent<HTMLButtonElement>) => void;
  }) => {
    // Return a component that accepts only the visual/accessibility props
    const Component = (
      props: Omit<FileSelectorProps, "onChange" | "onDragOver" | "onDrop" | "onDragEnter" | "onDragLeave">,
    ) => (
      <FileSelector
        {...props}
        onChange={handlers.onInputChange}
        onDragOver={handlers.onDragOver}
        onDrop={handlers.onDrop}
        onDragEnter={handlers.onDragEnter}
        onDragLeave={handlers.onDragLeave}
      />
    );

    Component.displayName = "FileSelectorWrapper"; // <-- fix the ESLint warning

    return Component;
  };

  // Then in the hook's return:
  const BoundFileSelector = useMemo(
    () =>
      createFileSelectorComponent({
        onInputChange,
        onDragOver,
        onDrop,
        onDragEnter,
        onDragLeave,
      }),
    [onInputChange, onDragOver, onDrop, onDragEnter, onDragLeave],
  );

  return {
    //Properties
    validFiles,
    invalidFiles,

    //Methods
    clearCache,
    getValidFileStreams,
    onCancel,
    onIdChange,
    onRemoveFile,
    clearBlobs,
    clearBlob: clearBlobFromMemory,

    //Errors
    maxUploadError: maxUploadErrorRef.current,
    maxFileSizeError: maxFileSizeErrorRef.current,
    setMaximumFileSizeExceeded,
    setMaximumUploadsExceeded,

    //Component - Export the FileSelector
    FileSelector: BoundFileSelector,
  };
};

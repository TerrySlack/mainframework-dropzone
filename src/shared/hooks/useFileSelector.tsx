import { useCallback, useRef, useState, DragEvent, ChangeEvent } from "react";
import { ErrorMessage, FileData, IFileUploaderProps, IFileSelectorClasses } from "../types/types";
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
  acceptTypes,
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
    setUpdateTrigger((state: number) => (state += 1));
  }, []);

  const setMaximumFileSizeExceeded = useCallback((status = false) => {
    maxFileSizeErrorRef.current.status = status;
    maxFileSizeErrorRef.current.message = status
      ? `You have attempted upload a file(s) that exceeds the maximum size of ${printableMaximumFileSize}`
      : "";
    setUpdateTrigger((state: number) => (state += 1));
  }, []);

  const clearCache = useCallback(() => {
    //Clear any blobs held in memor
    clearBlobs();
    SetInvalidFiles([]);
    SetValidFiles([]);
  }, []);

  const onCancel = useCallback(() => {
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
        const { valid, invalid } = files.reduce(
          (acc, file: File) => {
            if (isValidFileType(file, acceptedTypes))
              acc.valid.push(SvgXmlnsAttributeCheck(file, defaultTypeExtensions));
            else acc.invalid.push(file);
            return acc;
          },
          { valid: [] as Promise<FileData>[], invalid: [] as File[] },
        );

        if (valid.length > 0) {
          Promise.all(valid).then((results) => {
            //validFiles.next(results);
            SetValidFiles(results);
          });
        }

        if (invalid.length > 0) {
          //invalidFiles.next(invalid);
          SetInvalidFiles(invalid);
        }
      }
    },
    [SvgXmlnsAttributeCheck, checkFilesMaximumSize, setMaximumFileSizeExceeded, setMaximumUploadsExceeded],
  );

  const onRemoveFile = useCustomCallback(
    (index: number) => {
      //
      const updatedValidFiles = validFiles.reduce((acc, file: FileData, i: number) => {
        if (i === index) {
          clearBlobFromMemory(file.url);
        } else {
          acc.push(file);
        }
        return acc;
      }, [] as FileData[]);

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

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      processFiles(files);
    },
    [processFiles],
  );

  //Drag and Drop

  const onDrop = useCallback(
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

  const clearBlobs = useCustomCallback(() => {
    //Remove any blobs created in memory
    validFiles.forEach(({ url }) => {
      clearBlobFromMemory(url);
    });
  }, [validFiles]);


  const FileSelectorRef = useRef(
    ({ inputClassName, clickableAreaClassName, dropZoneWrapperClassName, messageParagraphClassName }: IFileSelectorClasses) => (
      <FileSelector
        acceptTypes={acceptTypes}
        inputClassName={inputClassName}
        clickableAreaClassName={clickableAreaClassName}
        dropZoneWrapperClassName={dropZoneWrapperClassName}
        messageParagraphClassName={messageParagraphClassName}
        onChange={onInputChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
      />
    ),
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
    FileSelector: FileSelectorRef.current,
  };
};

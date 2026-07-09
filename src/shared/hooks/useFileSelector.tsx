import { useRef, useState } from "react";
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

const defaultBorder = "border-gray-500";
const defaultAlternateBorder = "border-zinc-600";

export const useFileSelector = ({
  maximumUploadCount = maxUploadCount,
  maximumFileSize = maxFileSize,
  acceptedTypes = defaultTypeExtensions,
}: IFileUploaderProps = {}) => {
  const [, setUpdateTrigger] = useState<number>(0);
  const [validFiles, SetValidFiles] = useState<FileData[]>([]);
  const [invalidFiles, SetInvalidFiles] = useState<File[]>([]);

  const dragDepthRef = useRef(0);
  const callIdRef = useRef(0);
  const borderClassRef = useRef(defaultAlternateBorder);

  const maxUploadErrorRef = useRef<ErrorMessage>({
    status: false,
    message: "",
  });
  const maxFileSizeErrorRef = useRef<ErrorMessage>({
    status: false,
    message: "",
  });

  const setMaximumUploadsExceeded = (status = false, fileCount?: number, maximumUploads?: number) => {
    maxUploadErrorRef.current.status = status;
    maxUploadErrorRef.current.message = status
      ? `You have attempted to upload ${fileCount} files. The maximum allowable uploads for this feature is ${maximumUploads}`
      : "";
    setUpdateTrigger((state) => state + 1);
  };

  const setMaximumFileSizeExceeded = (status = false) => {
    maxFileSizeErrorRef.current.status = status;
    maxFileSizeErrorRef.current.message = status
      ? `You have attempted to upload a file(s) that exceeds the maximum size of ${formatFileSize(maximumFileSize)}`
      : "";
    setUpdateTrigger((state) => state + 1);
  };

  const clearBlobs = () => {
    let i = 0;
    while (i < validFiles.length) {
      const file = validFiles[i].file;
      if (file instanceof File) {
        clearBlobFromMemory(file);
      }
      i++;
    }
  };

  const clearCache = () => {
    clearBlobs();
    SetInvalidFiles([]);
    SetValidFiles([]);
    setMaximumUploadsExceeded(false);
    setMaximumFileSizeExceeded(false);
  };

  const onCancel = () => {
    clearCache();
  };

  const getValidFileStreams = () => (validFiles.length ? validFiles.map(({ file }: FileData) => file) : []);

  const processFiles = (files: File[]) => {
    const callId = ++callIdRef.current;
    const maxFileSizeCheck = checkFilesMaximumSize(files, maximumFileSize);

    if (maxFileSizeCheck) {
      if (!maxFileSizeErrorRef.current.status) {
        setMaximumFileSizeExceeded(true);
      }
      SetValidFiles([]);
      SetInvalidFiles([]);
    } else {
      const valid: { file: File; promise: Promise<FileData | null> }[] = [];
      const invalid: File[] = [];

      let i = 0;
      while (i < files.length) {
        const file = files[i];
        if (isValidFileType(file, acceptedTypes)) {
          valid.push({ file, promise: svgXmlnsAttributeCheck(file, acceptedTypes) });
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
            if (nullFiles.length > 0) {
              SetInvalidFiles((state) => state.concat(nullFiles));
            }
            SetValidFiles((current) => {
              if (current.length + filteredResults.length > maximumUploadCount) {
                setMaximumUploadsExceeded(true, current.length + filteredResults.length, maximumUploadCount);
                return current;
              }
              return current.concat(filteredResults);
            });
          })
          .catch(() => {
            SetInvalidFiles((state) => state.concat(valid.map((v) => v.file)));
          });
      }

      if (invalid.length > 0) {
        SetInvalidFiles((state) => state.concat(invalid));
      }
    }
  };

  const onRemoveFile = (index: number) => {
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
  };

  const onIdChange = (index: number, id: string, files: FileData[]) => {
    const updatedValidFiles = files.map((fileData: FileData, i: number) => {
      if (i === index) {
        if (fileData.file instanceof File) clearBlobFromMemory(fileData.file);
        const renamedFile = renameFile(id, fileData.file);
        const newUrl = renamedFile instanceof File ? createUrlString(renamedFile) : fileData.url;
        return { ...fileData, file: renamedFile, id, url: newUrl };
      }
      return fileData;
    });
    SetValidFiles(updatedValidFiles);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    processFiles(files);
    event.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dragDepthRef.current = 0;
    const { classList } = e.currentTarget;
    classList.remove(defaultBorder);
    classList.add(borderClassRef.current);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const onDragOver = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const onDragEnter = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dragDepthRef.current++;
    const { classList } = e.currentTarget;
    classList.remove(borderClassRef.current);
    classList.add(defaultBorder);
  };

  const onDragLeave = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current > 0) return;
    const { classList } = e.currentTarget;
    classList.remove(defaultBorder);
    classList.add(borderClassRef.current);
  };

  const acceptRef = useRef(buildAcceptString(acceptedTypes));
  const BoundFileSelector = ({
    inputId,
    messageParagraph,
    inputClassName,
    clickableAreaClassName,
    dropZoneWrapperClassName,
    messageParagraphClassName,
    ariaLabel,
    ariaDescribedBy,
    ariaLabelButton,
  }: FileSelectorViewProps) => {
    borderClassRef.current = clickableAreaClassName ?? defaultAlternateBorder;
    return (
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
        onChange={onInputChange}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        accept={acceptRef.current}
      />
    );
  };
  BoundFileSelector.displayName = "FileSelectorWrapper";

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
    maxUploadError: maxUploadErrorRef.current,
    maxFileSizeError: maxFileSizeErrorRef.current,
    setMaximumFileSizeExceeded,
    setMaximumUploadsExceeded,
    FileSelector: BoundFileSelector,
  };
};

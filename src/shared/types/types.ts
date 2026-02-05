import { ChangeEvent, DragEvent } from "react";

export interface FileSelectorProps {
  inputId?: string;
  acceptTypes?: string;
  messageParagraph?: string;
  inputClassName?: string;
  clickableAreaClassName?: string;
  dropZoneWrapperClassName?: string;
  messageParagraphClassName?: string;
  /** Accessible name for the drop zone region (default: "File upload") */
  ariaLabel?: string;
  /** ID of element that describes the drop zone (e.g. help text) */
  ariaDescribedBy?: string;
  /** Accessible label for the file input button when messageParagraph is not sufficient */
  ariaLabelButton?: string;
  ariaLabelledBy?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (e: DragEvent<HTMLButtonElement>) => void;
  onDrop: (e: DragEvent<HTMLButtonElement>) => void;
  onDragEnter: (e: DragEvent<HTMLButtonElement>) => void;
  onDragLeave: (e: DragEvent<HTMLButtonElement>) => void;
}

//Incoming Props
export interface IFileUploaderProps {
  acceptTypes?: string;
  maximumUploadCount?: number;
  maximumFileSize?: number;
  acceptedTypes?: Record<string, string>;
}

export interface FileData {
  id: string;
  file: File | Blob;
  url: string;
  type: string;
}

export interface ErrorMessage {
  status: boolean;
  message: string;
}

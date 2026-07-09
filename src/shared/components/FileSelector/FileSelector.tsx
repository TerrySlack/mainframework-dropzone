import { useRef, useId } from "react";
import type { DragEvent } from "react";
import type { FileSelectorProps } from "../../types/types";
import { mergeStyles } from "../../utils/mergeStyles";

import "./tailwind.css";

import { withDragDefaults } from "../../utils/dragAndDrop";
const defaultAccept =
  ".png, .jpeg, .pdf, .svg, image/svg+xml, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const SCOPE_CLASS = "file-selector-scope";
const defaultInputClassName = "hiddenInput";
const defaultClickableAreaClassName =
  "dropzone border-dashed border-2 border-gray-500 p-4 rounded-md text-center cursor-pointer bg-inherit hover:border-gray-400 text-inherit font-bold py-2 px-4";
const defaultDropZoneWrapperClassName = "flex flex-col min-h-[120px] border border-gray-300 rounded-md shadow-md";
const defaultMessageParagraphClassName = "text-center text-gray-600";
const defaultMessageParagraph = "Drag 'n' drop some files here, or click to select files";

const defaultAriaLabel = "File upload drop zone";
const defaultAriaLabelButton = "Choose files to upload";

export const FileSelector = ({
  inputId,
  accept = defaultAccept,
  messageParagraph = defaultMessageParagraph,
  inputClassName,
  clickableAreaClassName,
  dropZoneWrapperClassName,
  messageParagraphClassName,
  ariaLabel = defaultAriaLabel,
  ariaDescribedBy,
  ariaLabelButton = defaultAriaLabelButton,
  onChange,
  onDragOver,
  onDrop,
  onDragEnter,
  onDragLeave,
}: FileSelectorProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messageId = useId();

  //Note, eslint doesn't like that I'm wrapping the anonymous function in withDragDefaults.  Ignore for now

  const internalOnClick = withDragDefaults(() => {
    fileInputRef.current?.click();
  });

  const internalOnDrop = withDragDefaults((e: DragEvent<HTMLButtonElement>) => {
    onDrop(e);
  });

  const internalOnDragOver = withDragDefaults((e: DragEvent<HTMLButtonElement>) => {
    onDragOver(e);
  });

  const internalOnDragEnter = withDragDefaults((e: DragEvent<HTMLButtonElement>) => {
    onDragEnter(e);
  });

  const internalOnDragLeave = withDragDefaults((e: DragEvent<HTMLButtonElement>) => {
    onDragLeave(e);
  });

  const inputClasses = mergeStyles(defaultInputClassName, inputClassName);
  const resolvedClickableAreaClassName = mergeStyles(
    clickableAreaClassName ?? defaultClickableAreaClassName,
    "w-full h-full flex-1 min-h-0",
  );
  const resolvedDropZoneWrapperClassName = mergeStyles(dropZoneWrapperClassName ?? defaultDropZoneWrapperClassName);
  const resolvedMessageParagraphClassName = mergeStyles(messageParagraphClassName ?? defaultMessageParagraphClassName);

  const resolvedInputId = inputId ?? messageId;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={mergeStyles(SCOPE_CLASS, resolvedDropZoneWrapperClassName)}
      draggable={false}
    >
      <button
        type="button"
        className={resolvedClickableAreaClassName}
        onClick={internalOnClick}
        onDragOver={internalOnDragOver}
        onDrop={internalOnDrop}
        onDragEnter={internalOnDragEnter}
        onDragLeave={internalOnDragLeave}
        draggable={false}
        aria-label={ariaLabelButton}
        aria-controls={resolvedInputId}
      >
        <p id={messageId} className={resolvedMessageParagraphClassName}>
          {messageParagraph}
        </p>
      </button>

      <input
        ref={fileInputRef}
        id={resolvedInputId}
        type="file"
        className={inputClasses}
        onChange={onChange}
        accept={accept}
        multiple
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
};
FileSelector.displayName = "FileSelector";

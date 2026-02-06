# @mainframework/dropzone

A React package that allows for the selection of files through drag and drop or the File Dialog API. Re-rendering is kept to a minimum, helping with application performance.

## Installation

```bash
npm i @mainframework/dropzone
# or
yarn add @mainframework/dropzone
```

## Running Tests

```bash
yarn test
# or
npm run test
```

## Hook Configuration

The `useFileSelector` hook accepts optional configuration:

```ts
const { ... } = useFileSelector({
  maximumUploadCount: 5,      // Default: 30
  maximumFileSize: 5e6,       // Default: 5 MB
  acceptedTypes: defaultTypeExtensions,  // MIME type map, see below
});
```

## Hook Exports

The hook returns the following:

### Properties

| Export         | Type         | Description                                                                                                   |
| -------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| `validFiles`   | `FileData[]` | Files that passed validation (accepted type, size, and count). Each item has `id`, `file`, `url`, and `type`. |
| `invalidFiles` | `File[]`     | Files the user selected that failed validation (wrong type or rejected).                                      |

### Methods

| Export                | Signature                                                | Description                                                                                    |
| --------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `clearCache`          | `() => void`                                             | Clears both `validFiles` and `invalidFiles`, and revokes blob URLs to free memory.             |
| `getValidFileStreams` | `() => (File \| Blob)[]`                                 | Returns the raw `File` or `Blob` instances from `validFiles` for upload or further processing. |
| `onCancel`            | `() => void`                                             | Same as `clearCache`; use when the user cancels selection.                                     |
| `onIdChange`          | `(index: number, id: string, files: FileData[]) => void` | Renames a file by ID. Pass the index, new ID, and current `validFiles` array.                  |
| `onRemoveFile`        | `(index: number) => void`                                | Removes the file at the given index from `validFiles` and revokes its blob URL.                |
| `clearBlobs`          | `() => void`                                             | Revokes blob URLs for all valid files to free memory. Does not clear the arrays.               |
| `clearBlob`           | `(file: File) => void`                                   | Revokes the blob URL for a single `File` instance.                                             |

### Error State

| Export                       | Type                                                                      | Description                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `maxUploadError`             | `{ status: boolean; message: string }`                                    | Reflects whether the max upload count was exceeded. Check `status` and show `message` in your UI.           |
| `maxFileSizeError`           | `{ status: boolean; message: string }`                                    | Reflects whether a file exceeded the max size. Check `status` and show `message` in your UI.                |
| `setMaximumUploadsExceeded`  | `(status?: boolean, fileCount?: number, maximumUploads?: number) => void` | Sets the max upload error state. Call with `true` and counts to show the error; call with `false` to clear. |
| `setMaximumFileSizeExceeded` | `(status?: boolean) => void`                                              | Sets the max file size error state. Call with `true` to show the error; call with `false` to clear.         |

### Component

| Export         | Description                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `FileSelector` | A pre-wired dropzone component. Renders a clickable area and hidden file input, with drag-and-drop handlers bound to the hook. |

### FileSelector Props

When rendering `FileSelector`, you can pass:

| Prop                        | Type     | Default                                                   | Description                                  |
| --------------------------- | -------- | --------------------------------------------------------- | -------------------------------------------- |
| `inputId`                   | `string` | auto-generated                                            | ID for the file input (for `aria-controls`). |
| `acceptTypes`               | `string` | `.png, .jpg, .jpeg, .pdf, .svg, ...`                      | `accept` attribute for the file input.       |
| `messageParagraph`          | `string` | "Drag 'n' drop some files here, or click to select files" | Text shown in the dropzone.                  |
| `inputClassName`            | `string` | `"hiddenInput"`                                           | CSS classes for the hidden input.            |
| `clickableAreaClassName`    | `string` | Tailwind dropzone styles                                  | CSS classes for the clickable area.          |
| `dropZoneWrapperClassName`  | `string` | Tailwind wrapper styles                                   | CSS classes for the outer wrapper.           |
| `messageParagraphClassName` | `string` | Tailwind text styles                                      | CSS classes for the message text.            |
| `ariaLabel`                 | `string` | "File upload drop zone"                                   | Accessible name for the drop zone.           |
| `ariaDescribedBy`           | `string` | —                                                         | ID of element that describes the drop zone.  |
| `ariaLabelButton`           | `string` | "Choose files to upload"                                  | Accessible label for the button.             |
| `ariaLabelledBy`            | `string` | —                                                         | ID of element that labels the button.        |

## Default Accepted Types

The package validates files against a MIME type map. You can override it via `acceptedTypes` in the hook config:

```ts
export const defaultTypeExtensions: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpeg",
  "image/jpg": ".jpg",
  "image/svg+xml": ".svg",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};
```

## Usage Example

```tsx
import { useFileSelector } from "@mainframework/dropzone";

export const App = () => {
  const {
    validFiles,
    invalidFiles,
    onIdChange,
    onCancel,
    onRemoveFile,
    FileSelector,
    maxUploadError,
    maxFileSizeError,
  } = useFileSelector({
    maximumUploadCount: 5,
    maximumFileSize: 5e6,
  });

  const onSelect = () => {
    if (Array.isArray(validFiles)) {
      // Use validFiles for upload or preview
    }
  };

  return (
    <>
      <FileSelector messageParagraph="Drop files here or click to select" acceptTypes=".png,.jpg,.jpeg,.pdf" />

      {maxUploadError.status && <p role="alert">{maxUploadError.message}</p>}
      {maxFileSizeError.status && <p role="alert">{maxFileSizeError.message}</p>}

      {validFiles.length > 0 && (
        <PreviewImages
          validFiles={validFiles}
          onChange={onIdChange}
          onSelect={onSelect}
          onCancel={onCancel}
          onRemoveFile={onRemoveFile}
        />
      )}
    </>
  );
};
```

## Manipulating validFiles in a Preview Component

As an example, when building a preview component (e.g. `PreviewImages`), use the hook’s methods to update `validFiles` based on user actions:

| User action              | Hook method    | How to use it                                                                                                                                                                                                                       |
| ------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Remove a single file** | `onRemoveFile` | Call `onRemoveFile(index)` when the user removes one file. The index is the position in `validFiles` (e.g. from a list key or map index). The hook removes that item and revokes its blob URL.                                      |
| **Rename a file**        | `onIdChange`   | Call `onIdChange(index, newId, validFiles)` when the user changes a file’s name. Pass the index, the new ID (filename without extension), and the current `validFiles` array. The hook updates the file’s `id` and `file` in place. |
| **Clear all files**      | `onCancel`     | Call `onCancel()` when the user cancels or clears the selection. The hook clears `validFiles` and `invalidFiles` and revokes all blob URLs.                                                                                         |

Example `PreviewImages` wiring:

```tsx
const PreviewImages = ({ validFiles, onChange, onCancel, onRemoveFile }) => (
  <div>
    {validFiles.map((fileData, index) => (
      <div key={fileData.id}>
        <img src={fileData.url} alt={fileData.id} />
        <input value={fileData.id} onChange={(e) => onChange(index, e.target.value, validFiles)} />
        <button onClick={() => onRemoveFile(index)}>Remove</button>
      </div>
    ))}
    <button onClick={onCancel}>Clear all</button>
  </div>
);
```

- **`onRemoveFile(index)`** — removes the file at `index` from `validFiles`.
- **`onChange(index, newId, validFiles)`** — renames the file at `index` to `newId`; pass the current `validFiles` so the hook can update state.
- **`onCancel()`** — clears all files and frees blob URLs.

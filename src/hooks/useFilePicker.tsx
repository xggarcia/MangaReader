import { useRef, type ChangeEvent, type ReactElement } from 'react';

/**
 * System file picker (several files at once). No `accept` filter on purpose: Android maps it to
 * MIME types and CBZ/CBR files often have none, so they would be hidden. Formats are validated
 * by content when importing.
 */
export function useFilePicker(onFiles: (files: File[]) => void): {
  openPicker: () => void;
  pickerInput: ReactElement;
} {
  const input = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length > 0) onFiles(files);
  };

  return {
    openPicker: () => input.current?.click(),
    pickerInput: (
      <input ref={input} type="file" multiple hidden tabIndex={-1} onChange={handleChange} />
    ),
  };
}

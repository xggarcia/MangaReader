import { useRef, useState, type DragEvent } from 'react';

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes('Files');
}

/** Drag-and-drop of files onto an element. Spread `handlers` on the drop target. */
export function useFileDrop(onFiles: (files: File[]) => void) {
  const [isDragging, setIsDragging] = useState(false);
  // dragenter/dragleave fire for every child element; count them to know when the drag leaves.
  const depth = useRef(0);

  const handlers = {
    onDragEnter: (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current++;
      setIsDragging(true);
    },
    onDragOver: (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    },
    onDragLeave: (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setIsDragging(false);
    },
    onDrop: (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setIsDragging(false);
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) onFiles(files);
    },
  };

  return { isDragging, handlers };
}

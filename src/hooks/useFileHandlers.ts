// Copyright © 2025 Anton Medvedev
// SPDX‑License‑Identifier: AGPL‑3.0‑or‑later

import { useCallback, useRef } from 'react';

export interface FileItem {
  id: string;
  file: File;
}

interface UseFileHandlersProps {
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  setPreviews: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
  generateId: () => string;
}

export function useFileHandlers({ setFiles, setPreviews, generateId }: UseFileHandlersProps) {
  const dragCounter = useRef(0);

  const handleDrop = useCallback((event: React.DragEvent<Element>, setIsDragActive: (v: boolean) => void) => {
    event.preventDefault();
    dragCounter.current = 0;
    setIsDragActive(false);
    const droppedFiles = Array.from(event.dataTransfer.files || []).filter(
      (file) => file.type === 'application/pdf'
    );
    if (droppedFiles.length) {
      const newFileItems: FileItem[] = droppedFiles.map(file => ({ id: generateId(), file }));
      setFiles((prev) => [...prev, ...newFileItems]);
      setPreviews((prev) => {
        const next = { ...prev };
        newFileItems.forEach(item => {
          next[item.id] = null;
        });
        return next;
      });
    }
  }, [setFiles, setPreviews, generateId]);

  const handleDragOver = useCallback((event: React.DragEvent<Element>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent<Element>, setIsDragActive: (v: boolean) => void) => {
    event.preventDefault();
    dragCounter.current += 1;
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<Element>, setIsDragActive: (v: boolean) => void) => {
    event.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragActive(false);
  }, []);

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []).filter(
      (file) => file.type === 'application/pdf'
    );
    if (selectedFiles.length) {
      const newFileItems: FileItem[] = selectedFiles.map(file => ({ id: generateId(), file }));
      setFiles((prev) => [...prev, ...newFileItems]);
      setPreviews((prev) => {
        const next = { ...prev };
        newFileItems.forEach(item => {
          next[item.id] = null;
        });
        return next;
      });
    }
    event.target.value = '';
  }, [setFiles, setPreviews, generateId]);

  const handleDelete = useCallback((id: string) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
    setPreviews((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [setFiles, setPreviews]);

  const handleClear = useCallback(() => {
    setFiles([]);
    setPreviews({});
  }, [setFiles, setPreviews]);

  return {
    handleDrop,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleFileInput,
    handleDelete,
    handleClear,
  };
} 
// Copyright © 2025 Anton Medvedev
// SPDX‑License‑Identifier: AGPL‑3.0‑or‑later

import { useCallback, useRef } from 'react';
import { trackError, trackEvent } from '@/lib/amplitude';

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
    try {
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
        trackEvent('files_added', {
          method: 'drop',
          count: newFileItems.length,
          names: newFileItems.map(f => f.file.name),
          sizes: newFileItems.map(f => f.file.size)
        });
      }
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'file_drop_handler',
        fileCount: event.dataTransfer.files?.length
      });
    }
  }, [setFiles, setPreviews, generateId]);

  const handleDragOver = useCallback((event: React.DragEvent<Element>) => {
    try {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'file_drag_over_handler'
      });
    }
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent<Element>, setIsDragActive: (v: boolean) => void) => {
    try {
      event.preventDefault();
      dragCounter.current += 1;
      setIsDragActive(true);
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'file_drag_enter_handler'
      });
    }
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<Element>, setIsDragActive: (v: boolean) => void) => {
    try {
      event.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) setIsDragActive(false);
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'file_drag_leave_handler'
      });
    }
  }, []);

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    try {
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
        trackEvent('files_added', {
          method: 'input',
          count: newFileItems.length,
          names: newFileItems.map(f => f.file.name),
          sizes: newFileItems.map(f => f.file.size)
        });
      }
      event.target.value = '';
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'file_input_handler',
        fileCount: event.target.files?.length
      });
    }
  }, [setFiles, setPreviews, generateId]);

  const handleDelete = useCallback((id: string) => {
    try {
      setFiles((prev) => prev.filter((item) => item.id !== id));
      setPreviews((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'file_delete_handler',
        fileId: id
      });
    }
  }, [setFiles, setPreviews]);

  const handleClear = useCallback(() => {
    try {
      setFiles([]);
      setPreviews({});
      trackEvent('files_cleared');
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'file_clear_handler'
      });
    }
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
// Copyright © 2025 Anton Medvedev
// SPDX‑License‑Identifier: AGPL‑3.0‑or‑later

import { useCallback } from 'react';
import { useMupdf } from './useMupdf';
import type { FileItem } from './useFileHandlers';
import { trackError } from '@/lib/amplitude';

export function usePdfProcessing(
  files: FileItem[],
  previews: Record<string, string | null>,
  setPreviews: React.Dispatch<React.SetStateAction<Record<string, string | null>>>
) {
  const { mergeDocuments, renderFirstPage, isWorkerInitialized } = useMupdf();

  // Generate previews for new files only
  const generatePreviews = useCallback(async () => {
    if (!isWorkerInitialized) return;
    const missing = files.filter(item => previews[item.id] == null);
    if (missing.length === 0) return;
    const newEntries: Record<string, string | null> = {};
    await Promise.all(
      missing.map(async (item) => {
        try {
          const buffer = await item.file.arrayBuffer();
          const preview = await renderFirstPage(buffer);
          newEntries[item.id] = preview;
        } catch (error) {
          trackError(error instanceof Error ? error : new Error(String(error)), {
            context: 'pdf_preview_generation',
            fileName: item.file.name,
            fileSize: item.file.size
          });
          newEntries[item.id] = null;
        }
      })
    );
    // Only update if there are new entries
    if (Object.keys(newEntries).length > 0) {
      setPreviews(prev => ({ ...prev, ...newEntries }));
    }
  }, [files, previews, isWorkerInitialized, renderFirstPage, setPreviews]);

  // Merge PDFs
  const mergePdfs = useCallback(async () => {
    try {
      const fileBuffers = await Promise.all(files.map(item => item.file.arrayBuffer()));
      return await mergeDocuments(fileBuffers);
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'pdf_merge',
        fileCount: files.length,
        fileNames: files.map(f => f.file.name)
      });
      throw error;
    }
  }, [files, mergeDocuments]);

  return {
    isWorkerInitialized,
    generatePreviews,
    mergePdfs,
  };
} 
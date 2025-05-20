import { useCallback } from 'react';
import { useMupdf } from './useMupdf';
import type { FileItem } from './useFileHandlers';

export function usePdfProcessing(
  files: FileItem[],
  previews: Record<string, string | null>,
  setPreviews: React.Dispatch<React.SetStateAction<Record<string, string | null>>>
) {
  const { mergeDocuments, renderFirstPage, isWorkerInitialized } = useMupdf();

  // Generate previews for new files only
  const generatePreviews = useCallback(async () => {
    console.log('generatePreviews called');
    console.log('isWorkerInitialized:', isWorkerInitialized);
    if (!isWorkerInitialized) return;
    console.log('files:', files);
    const missing = files.filter(item => previews[item.id] == null);
    console.log('missing previews for:', missing.map(f => f.file.name));
    if (missing.length === 0) return;
    const newEntries: Record<string, string | null> = {};
    await Promise.all(
      missing.map(async (item) => {
        try {
          const buffer = await item.file.arrayBuffer();
          const preview = await renderFirstPage(buffer);
          console.log('renderFirstPage result for', item.file.name, ':', preview);
          newEntries[item.id] = preview;
        } catch (err) {
          console.error('Error rendering preview for', item.file.name, err);
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
    const fileBuffers = await Promise.all(files.map(item => item.file.arrayBuffer()));
    return mergeDocuments(fileBuffers);
  }, [files, mergeDocuments]);

  return {
    isWorkerInitialized,
    generatePreviews,
    mergePdfs,
  };
} 
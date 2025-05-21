import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyStateCard } from '@/components/empty-state-card';
import DragAndDropCardGrid from '@/components/drag-and-drop-card-grid';
import '@/styles/empty-state.css';
import { useFileHandlers } from './hooks/useFileHandlers';
import { usePdfProcessing } from './hooks/usePdfProcessing';
import { AnimatedDownloadButton } from "@/components/animated-download-button";

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface FileItem {
  id: string;
  file: File;
}

const App: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [previews, setPreviews] = useState<Record<string, string | null>>({});
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [mergedPdfBlob, setMergedPdfBlob] = useState<Blob | null>(null);
  const [isDownloadSuccess, setIsDownloadSuccess] = useState(false);
  const [isDownloadLoading, setIsDownloadLoading] = useState(false);

  // File handlers
  const {
    handleDrop,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleFileInput,
    handleDelete,
    handleClear,
  } = useFileHandlers({ setFiles, setPreviews, generateId });

  // PDF processing
  const { isWorkerInitialized, generatePreviews, mergePdfs } = usePdfProcessing(files, previews, setPreviews);

  // Dark mode effect
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    function updateDarkMode(e?: MediaQueryListEvent) {
      if ((e && e.matches) || (!e && mediaQuery.matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    updateDarkMode();
    mediaQuery.addEventListener('change', updateDarkMode);
    return () => mediaQuery.removeEventListener('change', updateDarkMode);
  }, []);

  // Generate previews when files are added
  useEffect(() => {
    if (isWorkerInitialized) generatePreviews();
  }, [files, isWorkerInitialized, generatePreviews]);

  // Merge handler
  const handleMerge = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const mergedPdf = await mergePdfs();
      const blob = new Blob([mergedPdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setMergedPdfUrl(url);
      setMergedPdfBlob(blob);
    } catch (error) {
      console.error('Error merging PDFs:', error);
      alert('Failed to merge PDFs. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [mergePdfs, isProcessing]);

  // Reorder handler
  const handleReorder = useCallback((newItems: {id: string}[]) => {
    setFiles(prevFiles => {
      // Map new order to files by id
      return newItems.map(item => prevFiles.find(f => f.id === item.id)).filter(Boolean) as FileItem[];
    });
  }, []);

  // Helper to crop file name
  function cropFileName(name: string, max: number = 32): string {
    if (name.length <= max) return name;
    const ext = name.split('.').pop();
    return name.slice(0, max - (ext?.length ?? 0) - 4) + '...' + (ext ? '.' + ext : '');
  }

  // Helper to clear all PDF-related state
  function clearPdfState() {
    handleClear();
    setMergedPdfUrl(null);
    setMergedPdfBlob(null);
  }

  // Handler for download button
  async function handleDownload() {
    if (!mergedPdfBlob) return;
    setIsDownloadLoading(true);
    // Simulate loading (or do real async work here)
    await new Promise(r => setTimeout(r, 1200));
    const url = mergedPdfUrl || URL.createObjectURL(mergedPdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'merged.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsDownloadSuccess(true);
    setIsDownloadLoading(false);
    setTimeout(() => setIsDownloadSuccess(false), 1800);
    // Do not revokeObjectURL immediately, user may want to download again
  }

  return (
    <div
      className={cn(
        "min-h-screen w-full flex flex-col",
        "bg-[url('/background-tile.svg')] bg-repeat bg-[length:64px_64px]",
        "dark:bg-[url('/background-tile-dark.svg')] dark:bg-repeat dark:bg-[length:64px_64px]"
      )}
    >
      {/* Header */}
      <header className="w-full flex items-center justify-between px-6 py-4 md:px-12 md:py-6">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={clearPdfState}
        >
          <img src="/icons/app-icon.svg" alt="PDF joiner logo" className="h-8 w-8" />
          <span className="font-gabarito font-semibold text-lg md:text-xl text-gray-900 dark:text-white tracking-tight" style={{letterSpacing: '-1px', lineHeight: '0.9', fontFamily: 'Gabarito, sans-serif'}}>PDF joiner</span>
        </div>
      </header>
      {/* Main grid area */}
      <main className="flex-1 flex items-start justify-center px-2 py-6">
        {mergedPdfUrl ? (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-[#182B47] rounded-2xl shadow-lg flex flex-col items-center px-8 py-10 gap-6 max-w-[600px] w-full">
              <img src="/icons/thumbs-up.svg" alt="Merged!" className="w-10 h-10 mb-2" />
              <div className="font-gabarito text-2xl font-bold text-center text-[#0C1A2D] dark:text-white">PDFs have been merged!</div>
              <div className="flex flex-row items-center gap-2 mt-6">
                <div className="w-full flex justify-center">
                  <div className="rounded-full bg-neutral-800 text-white dark:bg-gray-200 dark:text-gray-900">
                    <AnimatedDownloadButton
                      isLoading={isDownloadLoading}
                      isSuccess={isDownloadSuccess}
                      onClick={handleDownload}
                    >
                      <span className="dark:text-gray-900">Download merged PDF</span>
                    </AnimatedDownloadButton>
                  </div>
                </div>
              </div>
              <Button
                className="mt-4 w-full max-w-xs mx-auto bg-gray-100 dark:bg-gray-200 text-gray-900 dark:text-gray-900 hover:bg-gray-200 dark:hover:bg-gray-300"
                onClick={clearPdfState}
              >
                <img src="/icons/arrow-left-circle.svg" alt="Back" className="w-5 h-5 mr-2" />
                To main page
              </Button>
            </div>
          </div>
        ) : files.length === 0 ? (
          <EmptyStateCard
            isDragActive={isDragActive}
            isProcessing={isProcessing}
            onDrop={e => handleDrop(e, setIsDragActive)}
            onDragOver={handleDragOver}
            onDragEnter={e => handleDragEnter(e, setIsDragActive)}
            onDragLeave={e => handleDragLeave(e, setIsDragActive)}
            onFileSelect={handleFileInput}
          />
        ) : (
          <div className="w-full max-w-screen-xl mx-auto flex-1 flex flex-col">
            <DragAndDropCardGrid
              items={files.map(item => ({
                id: item.id,
                name: cropFileName(item.file.name),
                preview: previews[item.id] || null,
              }))}
              onDelete={handleDelete}
              onReorder={handleReorder}
              isDragActive={isDragActive}
              isProcessing={isProcessing}
              onDrop={e => handleDrop(e, setIsDragActive)}
              onDragOver={handleDragOver}
              onDragEnter={e => handleDragEnter(e, setIsDragActive)}
              onDragLeave={e => handleDragLeave(e, setIsDragActive)}
              onFileSelect={handleFileInput}
            />
          </div>
        )}
      </main>
      {/* Fixed Join PDFs button at the bottom, overlays grid if needed */}
      {files.length > 0 && !mergedPdfUrl && (
        <footer className="fixed bottom-0 left-0 w-full bg-white dark:bg-[#182B47] py-6 flex justify-center z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
          <Button
            className="w-full max-w-md bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg px-6 py-4 text-lg shadow-lg border-0"
            disabled={isProcessing}
            onClick={handleMerge}
          >
            {isProcessing ? 'Joining…' : 'Join PDFs'}
          </Button>
        </footer>
      )}
    </div>
  );
};

export default App;

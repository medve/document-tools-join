// Copyright © 2025 Anton Medvedev
// SPDX‑License‑Identifier: AGPL‑3.0

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyStateCard } from '@/components/empty-state-card';
import DragAndDropCardGrid from '@/components/drag-and-drop-card-grid';
import '@/styles/empty-state.css';
import { useFileHandlers } from './hooks/useFileHandlers';
import { usePdfProcessing } from './hooks/usePdfProcessing';
import { AnimatedDownloadButton } from "@/components/animated-download-button";
import { trackError, trackEvent } from '@/lib/amplitude';
import { RatingWidget } from "@/components/rating-widget";

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || "antonmedve@gmail.com";
const GITHUB_URL = import.meta.env.VITE_GITHUB_URL || "https://github.com/medve/document-tools-join";

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
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Track app opened
  useEffect(() => {
    trackEvent('app_opened', {
      version: import.meta.env.VITE_APP_VERSION
    });
  }, []);

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
    try {
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
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'dark_mode_handler'
      });
    }
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
      trackEvent('files_joined', {
        count: files.length,
        names: files.map(f => f.file.name),
        sizes: files.map(f => f.file.size),
        resultSize: blob.size
      });
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'pdf_merge_handler',
        fileCount: files.length
      });
      alert('Failed to merge PDFs. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [mergePdfs, isProcessing, files]);

  // Reorder handler
  const handleReorder = useCallback((newItems: {id: string}[]) => {
    try {
      setFiles(prevFiles => {
        return newItems.map(item => prevFiles.find(f => f.id === item.id)).filter(Boolean) as FileItem[];
      });
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'file_reorder_handler',
        itemCount: newItems.length
      });
    }
  }, []);

  // Helper to crop file name
  function cropFileName(name: string, max: number = 32): string {
    try {
      if (name.length <= max) return name;
      const ext = name.split('.').pop();
      return name.slice(0, max - (ext?.length ?? 0) - 4) + '...' + (ext ? '.' + ext : '');
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'file_name_crop',
        fileName: name,
        maxLength: max
      });
      return name;
    }
  }

  // Helper to clear all PDF-related state
  function clearPdfState() {
    try {
      handleClear();
      setMergedPdfUrl(null);
      setMergedPdfBlob(null);
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'pdf_state_clear'
      });
    }
  }

  // Handler for download button
  async function handleDownload() {
    if (!mergedPdfBlob) return;
    setIsDownloadLoading(true);
    try {
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
      setTimeout(() => setIsDownloadSuccess(false), 1800);
      trackEvent('file_downloaded', {
        size: mergedPdfBlob.size,
        url: url
      });
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'pdf_download_handler',
        blobSize: mergedPdfBlob.size
      });
    } finally {
      setIsDownloadLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "min-h-screen w-full flex flex-col",
        "bg-[url('/background-tile.svg')] bg-repeat bg-[length:64px_64px]",
        "dark:bg-[url('/background-tile-dark.svg')] dark:bg-repeat dark:bg-[length:64px_64px]"
      )}
    >
      {/* Header - always on top */}
      <header className="w-full flex items-center justify-between px-6 py-4 md:px-12 md:py-6 z-50 fixed top-0 left-0 bg-transparent dark:bg-transparent">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={clearPdfState}
        >
          <img src="/icons/app-icon.svg" alt="PDF joiner logo" className="h-8 w-8" />
          <span
            style={{
              fontSize: 24,
              fontFamily: 'Gabarito',
              fontWeight: 600,
              lineHeight: '21.6px',
              wordWrap: 'break-word',
            }}
            className="logo-text"
          >
            PDF joiner
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsContactOpen(true)}
          style={{
            color: '#999999',
            fontSize: 16,
            fontFamily: 'Gabarito',
            fontWeight: 500,
            lineHeight: '14.4px',
            wordWrap: 'break-word',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'none',
            letterSpacing: 0,
          }}
        >
          Contact us
        </button>
      </header>
      {/* Contact Modal */}
      {isContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setIsContactOpen(false)}>
          <div
            className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center relative"
            style={{ maxWidth: '30rem', width: '130%', minWidth: 320 }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setIsContactOpen(false)}
              aria-label="Close"
              style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}
            >
              ×
            </button>
            <div className="font-gabarito text-lg font-semibold mb-2" style={{ color: '#000' }}>Contact us</div>
            <div className="text-base mb-4 text-center break-all" style={{ color: '#000' }}>
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#000', textDecoration: 'none' }}>{CONTACT_EMAIL}</a>
            </div>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-medium"
              style={{ fontFamily: 'Gabarito', color: '#000', textDecoration: 'none', textAlign: 'center' }}
            >
              GitHub
            </a>
          </div>
        </div>
      )}
      {/* Main grid area */}
      <main className="flex-1 flex items-start justify-center px-2 py-6 pt-24">
        {mergedPdfUrl ? (
          <div className="fixed inset-0 flex flex-col items-center justify-center z-40">
            <div className="bg-white dark:bg-[#182B47] rounded-2xl shadow-lg flex flex-col items-center px-8 py-10 gap-0 max-w-[600px] w-full">
              <img src="/icons/thumbs-up.svg" alt="Merged!" className="w-10 h-10 mb-0" />
              <div style={{ height: 24 }} />
              <div className="font-gabarito text-2xl font-bold text-center text-[#0C1A2D] dark:text-white">PDFs have been merged!</div>
              <div style={{ height: 24 }} />
              <div className="flex flex-row items-center gap-2 mt-0">
                <div className="w-full flex justify-center">
                  <div className="rounded-full bg-neutral-800 dark:bg-white text-white dark:text-gray-900">
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
              <RatingWidget className="mt-6" />
            </div>
            <Button
              className="mt-6 w-full max-w-xs mx-auto bg-gray-100 dark:bg-gray-200/30 text-gray-900 dark:text-gray-900 hover:bg-gray-200 dark:hover:bg-gray-200/70 opacity-70"
              onClick={clearPdfState}
            >
              <img src="/icons/arrow-left-circle.svg" alt="Back" className="w-5 h-5 mr-2" />
              To main page
            </Button>
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
          <div className="w-full max-w-screen-xl mx-auto flex-1 flex flex-col pb-32">
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

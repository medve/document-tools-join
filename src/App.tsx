import React, { useCallback, useRef, useState, useEffect } from "react";
import { useMupdf } from "./hooks/useMupdf";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { X } from 'lucide-react';
import { CardList } from '@/components/ui/card-list';

function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

const App: React.FC = () => {
  const { t } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<(string | null)[]>([]);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const dragCounter = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mergeDocuments, renderFirstPage, isWorkerInitialized } = useMupdf();

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
    let isMounted = true;
    async function generatePreviews() {
      if (!isWorkerInitialized) return;
      const newPreviews = await Promise.all(
        files.map(async (file, i) => {
          if (previews[i]) return previews[i];
          try {
            const buffer = await file.arrayBuffer();
            return await renderFirstPage(buffer);
          } catch {
            return null;
          }
        })
      );
      if (isMounted) setPreviews(newPreviews);
    }
    generatePreviews();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, isWorkerInitialized]);

  const handleDrop = useCallback((event: React.DragEvent<Element>) => {
    event.preventDefault();
    dragCounter.current = 0;
    setIsDragActive(false);
    const droppedFiles = Array.from(event.dataTransfer.files || []).filter(
      (file) => file.type === 'application/pdf'
    );
    if (droppedFiles.length) {
      setFiles((prev) => [...prev, ...droppedFiles]);
      setPreviews((prev) => [...prev, ...Array(droppedFiles.length).fill(null)]);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<Element>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent<Element>) => {
    event.preventDefault();
    dragCounter.current += 1;
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<Element>) => {
    event.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragActive(false);
  }, []);

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []).filter(
      (file) => file.type === 'application/pdf'
    );
    if (selectedFiles.length) {
      setFiles((prev) => [...prev, ...selectedFiles]);
      setPreviews((prev) => [...prev, ...Array(selectedFiles.length).fill(null)]);
    }
    event.target.value = '';
  }, []);

  const handleClear = useCallback(() => setFiles([]), []);

  const handleMerge = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const fileBuffers = await Promise.all(files.map(file => file.arrayBuffer()));
      const mergedPdf = await mergeDocuments(fileBuffers);
      const blob = new Blob([mergedPdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'merged.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error merging PDFs:', error);
      alert('Failed to merge PDFs. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [files, mergeDocuments, isProcessing]);

  const handleDelete = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleReorder = useCallback((newItems: any[]) => {
    // Remove the add-card if present
    const reordered = newItems.filter(item => !item.isAddCard);
    setFiles(prevFiles => {
      // Map new order to files
      return reordered.map(item => {
        const idx = files.findIndex(f => item.id.startsWith(f.name));
        return files[idx];
      });
    });
    setPreviews(prevPreviews => {
      return reordered.map(item => {
        const idx = files.findIndex(f => item.id.startsWith(f.name));
        return previews[idx];
      });
    });
  }, [files, previews]);

  // Helper to crop file name
  function cropFileName(name: string, max: number = 32): string {
    if (name.length <= max) return name;
    const ext = name.split('.').pop();
    return name.slice(0, max - (ext?.length ?? 0) - 4) + '...' + (ext ? '.' + ext : '');
  }

  // --- New grid layout with draggable tiles ---
  return (
    <div
      className={cn(
        "min-h-screen w-full flex flex-col",
        "bg-[url('/background-tile.svg')] bg-repeat bg-[length:64px_64px]",
        "dark:bg-[url('/background-tile-dark.svg')] dark:bg-repeat dark:bg-[length:64px_64px]"
      )}
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
    >
      {/* Header */}
      <header className="w-full flex items-center justify-between px-6 py-4 md:px-12 md:py-6">
        <div className="flex items-center gap-3">
          <img src="/icons/app-icon.svg" alt="PDF joiner logo" className="h-8 w-8" />
          <span className="font-gabarito font-semibold text-lg md:text-xl text-gray-900 dark:text-white tracking-tight" style={{letterSpacing: '-1px', lineHeight: '0.9', fontFamily: 'Gabarito, sans-serif'}}>PDF joiner</span>
        </div>
      </header>
      {/* Main grid area */}
      <main className="flex-1 flex items-start justify-center px-2 py-6">
        {files.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center">
            <div className="bg-white dark:bg-[#182B47] rounded-3xl shadow-lg p-10 max-w-[768px] w-full mx-auto flex flex-col items-center mt-16 md:mt-24">
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 w-full text-center transition-colors flex flex-col items-center justify-center",
                  isDragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600 bg-transparent",
                  isProcessing && "opacity-50 pointer-events-none"
                )}
                onDrop={isProcessing ? undefined : handleDrop}
                onDragOver={isProcessing ? undefined : handleDragOver}
                onDragEnter={isProcessing ? undefined : handleDragEnter}
                onDragLeave={isProcessing ? undefined : handleDragLeave}
                style={{ cursor: isProcessing ? 'not-allowed' : 'default' }}
              >
                <img src="/icons/upload-cloud.svg" alt="Upload" className="w-12 h-12 mx-auto mb-4" />
                <p className="font-medium text-xl text-gray-900 dark:text-white mb-2" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', lineHeight: '1.1' }}>
                  Drag and drop PDF files here
                </p>
              </div>
              <span className="text-gray-500 dark:text-gray-300 text-sm my-4" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>OR</span>
              <Button
                className="bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg px-8 py-3 text-base shadow-none border-0"
                disabled={isProcessing}
                style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
                onClick={isProcessing ? undefined : () => fileInputRef.current?.click()}
              >
                Select PDF files
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={handleFileInput}
                  disabled={isProcessing}
                  className="hidden"
                />
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-screen-xl mx-auto flex-1 flex flex-col">
            <CardList
              items={[
                {
                  id: 'add-card',
                  isAddCard: true,
                  onAddFiles: () => fileInputRef.current?.click(),
                  isProcessing,
                },
                ...files.map((file, index) => ({
                  id: file.name + index,
                  label: cropFileName(file.name),
                  preview: previews[index],
                  onDelete: () => handleDelete(index),
                })),
              ]}
              onReorder={handleReorder}
            />
          </div>
        )}
      </main>
      {/* Fixed Join PDFs button at the bottom, overlays grid if needed */}
      {files.length > 0 && (
        <footer className="fixed bottom-0 left-0 w-full bg-white py-6 flex justify-center z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
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

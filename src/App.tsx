import React, { useCallback, useRef, useState, useEffect } from "react";
import { useMupdf } from "./hooks/useMupdf";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

const App: React.FC = () => {
  const { t } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const dragCounter = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mergeDocuments } = useMupdf();

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

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current = 0;
    setIsDragActive(false);
    const droppedFiles = Array.from(event.dataTransfer.files || []).filter(
      (file) => file.type === 'application/pdf'
    );
    if (droppedFiles.length) setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current += 1;
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragActive(false);
  }, []);

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []).filter(
      (file) => file.type === 'application/pdf'
    );
    if (selectedFiles.length) setFiles((prev) => [...prev, ...selectedFiles]);
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

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    setFiles((prev) => reorder(prev, result.source.index, result.destination!.index));
  }, []);

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
      {/* Main Card */}
      <main className="flex-1 flex items-center justify-center px-2 py-6">
        <Card className="w-full max-w-xl rounded-2xl shadow-lg bg-white dark:bg-[#182B47] border-0">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 w-full max-w-xl text-center transition-colors flex flex-col items-center justify-center mb-6",
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
              <span className="text-gray-500 dark:text-gray-300 text-sm mb-4" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>OR</span>
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
            {files.length > 0 && (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="pdf-list">
                  {(provided) => (
                    <ul
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="mt-8 space-y-2"
                    >
                      {files.map((file, index) => (
                        <Draggable key={`${file.name}-${index}`} draggableId={`${file.name}-${index}`} index={index}>
                          {(provided, snapshot) => (
                            <li
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "flex items-center gap-2 p-3 rounded-md border bg-gray-50 dark:bg-[#22345A] dark:border-gray-700",
                                snapshot.isDragging && "shadow-lg"
                              )}
                            >
                              <span className="inline-flex items-center justify-center w-5 h-5">
                                <img src="/icons/app-icon.svg" alt="PDF file" className="w-5 h-5" />
                              </span>
                              <span className="text-sm truncate text-gray-900 dark:text-white" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>{file.name}</span>
                            </li>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </CardContent>
          {files.length > 0 && (
            <CardFooter className="flex justify-end gap-2 px-8 pb-8">
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={isProcessing}
                className="rounded-lg"
                style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
              >
                Clear
              </Button>
              <Button
                onClick={handleMerge}
                disabled={isProcessing}
                className="rounded-lg"
                style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Processing
                  </>
                ) : (
                  'Merge'
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      </main>
    </div>
  );
};

export default App;

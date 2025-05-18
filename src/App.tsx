import React, { useCallback, useRef, useState, useEffect } from "react";
import { useMupdf } from "./hooks/useMupdf";
import { Upload, Plus, FileText, X } from 'lucide-react';
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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const dragCounter = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mergeDocuments } = useMupdf();

  // Check system color scheme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Handle file drops anywhere in the widget
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current = 0;
    setIsDragActive(false);
    const droppedFiles = Array.from(event.dataTransfer.files || []).filter(
      (file) => file.type === 'application/pdf'
    );
    if (droppedFiles.length) {
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
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
    if (dragCounter.current === 0) {
      setIsDragActive(false);
    }
  }, []);

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []).filter(
      (file) => file.type === 'application/pdf'
    );
    if (selectedFiles.length) {
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
    event.target.value = '';
  }, []);

  const handleClear = useCallback(() => {
    setFiles([]);
  }, []);

  const handleMerge = useCallback(async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      const fileBuffers = await Promise.all(
        files.map(file => file.arrayBuffer())
      );
      
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

  const handleDropZoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={cn(
      "min-h-screen w-full bg-background p-4 md:p-8",
      isDarkMode ? "dark" : ""
    )}>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{t('app.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              isProcessing && "opacity-50 pointer-events-none"
            )}
            onDrop={isProcessing ? undefined : handleDrop}
            onDragOver={isProcessing ? undefined : handleDragOver}
            onDragEnter={isProcessing ? undefined : handleDragEnter}
            onDragLeave={isProcessing ? undefined : handleDragLeave}
            onClick={isProcessing ? undefined : handleDropZoneClick}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              {isDragActive ? t('app.dropZone.active') : t('app.dropZone.default')}
            </p>
            <Button variant="outline" disabled={isProcessing}>
              <Plus className="w-4 h-4 mr-2" />
              {t('app.addFiles')}
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
                    className="mt-6 space-y-2"
                  >
                    {files.map((file, index) => (
                      <Draggable key={`${file.name}-${index}`} draggableId={`${file.name}-${index}`} index={index}>
                        {(provided, snapshot) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "flex items-center gap-2 p-3 rounded-md border bg-card",
                              snapshot.isDragging && "shadow-lg"
                            )}
                          >
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <span className="text-sm truncate">{file.name}</span>
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
          <CardFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isProcessing}
            >
              <X className="w-4 h-4 mr-2" />
              {t('app.clear')}
            </Button>
            <Button
              onClick={handleMerge}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  {t('app.processing')}
                </>
              ) : (
                t('app.merge')
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default App;

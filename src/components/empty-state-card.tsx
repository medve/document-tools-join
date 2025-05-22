// Copyright © 2025 Anton Medvedev
// SPDX‑License‑Identifier: AGPL‑3.0

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRef } from "react";

interface EmptyStateCardProps {
  isDragActive: boolean;
  isProcessing: boolean;
  onDrop: (event: React.DragEvent<Element>) => void;
  onDragOver: (event: React.DragEvent<Element>) => void;
  onDragEnter: (event: React.DragEvent<Element>) => void;
  onDragLeave: (event: React.DragEvent<Element>) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function EmptyStateCard({
  isDragActive,
  isProcessing,
  onDrop,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onFileSelect,
}: EmptyStateCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <div className="empty-state-container">
        <div
          className={cn(
            "drop-zone",
            isDragActive && "drop-zone-active",
            isProcessing && "drop-zone-disabled"
          )}
          onDrop={isProcessing ? undefined : onDrop}
          onDragOver={isProcessing ? undefined : onDragOver}
          onDragEnter={isProcessing ? undefined : onDragEnter}
          onDragLeave={isProcessing ? undefined : onDragLeave}
          style={{ cursor: isProcessing ? 'not-allowed' : 'default' }}
        >
          <img src="/icons/upload-cloud.svg" alt="Upload" className="upload-icon" />
          <p className="upload-text font-sans">
            Drag and drop PDF files here
          </p>
        </div>
        <span className="divider font-sans">OR</span>
        <Button
          className="bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg px-8 py-3 text-base shadow-none border-0 font-sans"
          disabled={isProcessing}
          onClick={isProcessing ? undefined : () => fileInputRef.current?.click()}
        >
          Select PDF files
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={onFileSelect}
            disabled={isProcessing}
            className="hidden"
          />
        </Button>
      </div>
      <div style={{ marginTop: 24 }} className="flex items-center justify-center w-full">
        <img src="/icons/shield.svg" alt="Privacy ensured" className="w-5 h-5 mr-2" />
        <span
          className="text-black dark:text-white"
          style={{
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            lineHeight: '15.4px',
            wordWrap: 'break-word',
          }}
        >
          Privacy ensured: no server uploads
        </span>
      </div>
    </div>
  );
} 
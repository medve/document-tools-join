import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRef } from "react";

interface DragAndDropUploadCardProps {
  isDragActive: boolean;
  isProcessing: boolean;
  onDrop: (event: React.DragEvent<Element>) => void;
  onDragOver: (event: React.DragEvent<Element>) => void;
  onDragEnter: (event: React.DragEvent<Element>) => void;
  onDragLeave: (event: React.DragEvent<Element>) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function DragAndDropUploadCard({
  isDragActive,
  isProcessing,
  onDrop,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onFileSelect,
}: DragAndDropUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: 162, height: 180, minWidth: 162, minHeight: 180 }}
    >
      <Card
        className={cn(
          "relative w-full h-full flex flex-col justify-center items-center p-0 select-none bg-white transition-all duration-200",
          isDragActive
            ? "border-2 border-dashed border-[#3072DE] outline-none shadow-md"
            : "border-2 border-dashed border-gray-300 outline-none",
          isProcessing && "opacity-50 pointer-events-none"
        )}
        onDrop={isProcessing ? undefined : onDrop}
        onDragOver={isProcessing ? undefined : onDragOver}
        onDragEnter={isProcessing ? undefined : onDragEnter}
        onDragLeave={isProcessing ? undefined : onDragLeave}
        style={{ cursor: isProcessing ? 'not-allowed' : 'pointer', width: '100%', height: '100%', borderRadius: 8 }}
        tabIndex={0}
      >
        <CardContent className="flex flex-col items-center justify-center gap-6 p-0 w-full h-full">
          <div className="flex flex-col items-center justify-center gap-4 w-[125px]">
            <img
              src="/icons/upload-cloud.svg"
              alt="Upload"
              className="w-8 h-8"
              draggable={false}
            />
            <p className="w-full text-center font-inter font-semibold text-[14px] leading-[15.4px] text-[#0C1A2D]" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
              Drag and drop PDF files here
            </p>
          </div>
          <div className="inline-flex justify-center items-center gap-2" style={{ padding: 0 }}>
            <Button
              className="flex items-center justify-center bg-[#F7423D] text-white font-bold text-[14px] leading-[15.4px] font-inter rounded-lg border-0 shadow-none hover:bg-[#F7423D] focus:bg-[#F7423D] active:bg-[#F7423D] p-0 m-0"
              style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, lineHeight: '15.4px', width: 108, height: 31, minWidth: 108, minHeight: 31, maxWidth: 108, maxHeight: 31, borderRadius: 8, padding: 8 }}
              disabled={isProcessing}
              onClick={isProcessing ? undefined : () => fileInputRef.current?.click()}
              type="button"
            >
              Add PDF files
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
        </CardContent>
      </Card>
    </div>
  );
} 
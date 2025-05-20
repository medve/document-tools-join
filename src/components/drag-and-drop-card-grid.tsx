import React from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import { DragAndDropUploadCard } from "@/components/drag-and-drop-upload-card";
import { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { Transform } from '@dnd-kit/utilities';
import { DragEndEvent } from '@dnd-kit/core';
import { HTMLAttributes } from 'react';
import { cn } from "@/lib/utils";

interface CardItem {
  id: string;
  name: string;
  preview: string | null;
}

interface DragAndDropCardGridProps {
  items: CardItem[];
  onDelete: (id: string) => void;
  onReorder: (newItems: CardItem[]) => void;
  isDragActive: boolean;
  isProcessing: boolean;
  onDrop: (event: React.DragEvent<Element>, setIsDragActive: (v: boolean) => void) => void;
  onDragOver: (event: React.DragEvent<Element>) => void;
  onDragEnter: (event: React.DragEvent<Element>) => void;
  onDragLeave: (event: React.DragEvent<Element>) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

interface SortableCardProps {
  id: string;
  name: string;
  preview: string | null;
  onDelete: (id: string) => void;
  listeners: SyntheticListenerMap | undefined;
  attributes: HTMLAttributes<Element>;
  setNodeRef: (element: HTMLElement | null) => void;
  transform: Transform | null;
  transition: string | undefined;
  isDragging: boolean;
}

function SortableCard({ id, name, preview, onDelete, listeners, attributes, setNodeRef, transform, transition, isDragging }: SortableCardProps) {
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    cursor: 'grab',
    width: '162px',
    height: '180px',
    minWidth: '162px',
    minHeight: '180px',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative"
    >
      <Card
        className={cn(
          "relative rounded-lg w-full h-full flex flex-col justify-between p-0 border transition-colors group border-[#D0D5DD] bg-white"
        )}
        {...listeners}
        {...attributes}
        tabIndex={0}
      >
        {/* Delete button */}
        <button
          className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center z-10 shadow-sm p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
          aria-label="Delete"
          onClick={e => { e.stopPropagation(); onDelete(id); }}
          onPointerDown={e => e.stopPropagation()}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
        <CardContent className="flex flex-col items-center justify-center px-2 pt-6 pb-3">
          <div className="rounded-lg mb-2 w-full h-[100px] flex items-center justify-center overflow-hidden p-2" style={{padding: '8px'}}>
            {preview ? (
              <img
                src={preview}
                alt={name}
                className="object-contain w-full h-full rounded-lg"
                style={{ maxHeight: '100px', maxWidth: '100%' }}
              />
            ) : (
              <span className="text-gray-400 text-xs">Loading...</span>
            )}
          </div>
          <p
            className="truncate w-full text-center font-inter font-medium text-[12px] leading-[13.2px] text-[rgba(26,28,32,0.8)] mt-1 px-2"
            style={{ lineHeight: '13.2px', fontFamily: 'Inter, sans-serif', color: 'rgba(26,28,32,0.8)' }}
            title={name}
          >
            {name}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface SortableCardWrapperProps {
  item: CardItem;
  onDelete: (id: string) => void;
}

function SortableCardWrapper({ item, onDelete }: SortableCardWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  return (
    <SortableCard
      id={item.id}
      name={item.name}
      preview={item.preview}
      onDelete={onDelete}
      listeners={listeners}
      attributes={attributes}
      setNodeRef={setNodeRef}
      transform={transform}
      transition={transition}
      isDragging={isDragging}
    />
  );
}

export default function DragAndDropCardGrid({ items, onDelete, onReorder, isDragActive, isProcessing, onDrop, onDragOver, onDragEnter, onDragLeave, onFileSelect }: DragAndDropCardGridProps) {
  const [internalItems, setInternalItems] = React.useState(items);
  const [dragActive, setDragActive] = React.useState(isDragActive);

  React.useEffect(() => {
    setInternalItems(items);
    setDragActive(isDragActive);
  }, [items, isDragActive]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setInternalItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        const newArr = arrayMove(prev, oldIndex, newIndex);
        onReorder(newArr);
        return newArr;
      });
    }
  }

  function handleDrop(event: React.DragEvent<Element>) {
    onDrop(event, setDragActive);
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={internalItems} strategy={rectSortingStrategy}>
        <div className="mx-auto max-w-[1040px] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-2 sm:p-4 justify-center">
          <DragAndDropUploadCard
            isDragActive={dragActive}
            isProcessing={isProcessing}
            onDrop={handleDrop}
            onDragOver={onDragOver}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onFileSelect={onFileSelect}
          />
          {internalItems.map((item) => (
            <SortableCardWrapper key={item.id} item={item} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
} 
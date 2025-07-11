// Copyright © 2025 Anton Medvedev
// SPDX‑License‑Identifier: AGPL‑3.0

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
  isProcessing: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRotate: (id: string) => void;
}

interface SortableCardProps {
  id: string;
  name: string;
  preview: string | null;
  onDelete: (id: string) => void;
  onRotate: (id: string) => void;
  listeners: SyntheticListenerMap | undefined;
  attributes: HTMLAttributes<Element>;
  setNodeRef: (element: HTMLElement | null) => void;
  transform: Transform | null;
  transition: string | undefined;
  isDragging: boolean;
}

function SortableCard({ id, name, preview, onDelete, onRotate, listeners, attributes, setNodeRef, transform, transition, isDragging }: SortableCardProps) {
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
          "relative rounded-lg w-full h-full flex flex-col justify-between p-0 border transition-colors group border-[#D0D5DD] bg-white dark:bg-[#182B47]"
        )}
        {...listeners}
        {...attributes}
        tabIndex={0}
      >
        {/* Delete button */}
        <button
          className="absolute top-2 right-2 w-7 h-7 bg-white dark:bg-[#101A26] rounded-full flex items-center justify-center z-10 shadow-sm p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
          aria-label="Delete"
          onClick={e => { e.stopPropagation(); onDelete(id); }}
          onPointerDown={e => e.stopPropagation()}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
        {/* Rotate button */}
        <button
          className="absolute top-2 left-2 w-7 h-7 bg-white dark:bg-[#101A26] rounded-full flex items-center justify-center z-10 shadow-sm p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
          aria-label="Rotate"
          onClick={e => { e.stopPropagation(); onRotate(id); }}
          onPointerDown={e => e.stopPropagation()}
          type="button"
        >
          <img src="/icons/rotate-cw.svg" alt="Rotate" className="w-4 h-4" />
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
            className="truncate w-full text-center font-inter font-medium text-[12px] leading-[13.2px] text-[rgba(26,28,32,0.8)] dark:text-white mt-1 px-2"
            style={{ lineHeight: '13.2px', fontFamily: 'Inter, sans-serif' }}
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
  onRotate: (id: string) => void;
}

function SortableCardWrapper({ item, onDelete, onRotate }: SortableCardWrapperProps) {
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
      onRotate={onRotate}
      listeners={listeners}
      attributes={attributes}
      setNodeRef={setNodeRef}
      transform={transform}
      transition={transition}
      isDragging={isDragging}
    />
  );
}

export default function DragAndDropCardGrid({ items, onDelete, onReorder, isProcessing, onFileSelect, onRotate }: DragAndDropCardGridProps) {
  const [internalItems, setInternalItems] = React.useState(items);

  React.useEffect(() => {
    setInternalItems(items);
  }, [items]);

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


  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="w-full flex justify-center">
        <p
          className="mb-2 text-center text-foreground dark:text-white"
          style={{
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            lineHeight: '15.4px',
            wordWrap: 'break-word',
            maxWidth: '1000px',
          }}
        >
          To change the order of your PDFs, drag and drop the files as you want.
        </p>
      </div>
      <SortableContext items={internalItems} strategy={rectSortingStrategy}>
        <div className="mx-auto max-w-[1040px] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-2 sm:p-4 justify-center">
          <DragAndDropUploadCard
            isProcessing={isProcessing}
            onFileSelect={onFileSelect}
          />
          {internalItems.map((item) => (
            <SortableCardWrapper key={item.id} item={item} onDelete={onDelete} onRotate={onRotate} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
} 
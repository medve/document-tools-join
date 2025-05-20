'use client';

import * as React from 'react';
import { Card } from './card';

export interface CardItem {
  id: string;
  label?: string;
  preview?: string | null;
  onDelete?: () => void;
  isAddCard?: boolean;
  onAddFiles?: () => void;
  isProcessing?: boolean;
}

interface CardListProps {
  items: CardItem[];
  onReorder?: (newItems: CardItem[]) => void;
}

export function CardList({ items, onReorder }: CardListProps) {
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);
  const [touchStartIdx, setTouchStartIdx] = React.useState<number | null>(null);
  const [touchOverIdx, setTouchOverIdx] = React.useState<number | null>(null);
  const [isDraggingOverAddCard, setIsDraggingOverAddCard] = React.useState(false);

  function reorder(list: CardItem[], startIndex: number, endIndex: number): CardItem[] {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  }

  // Desktop drag handlers
  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragOver(id: string) {
    setDragOverId(id);
  }

  function handleDrop(id: string) {
    if (!draggedId || draggedId === id) return;
    const draggedIdx = items.findIndex(item => item.id === draggedId);
    const dropIdx = items.findIndex(item => item.id === id);
    if (draggedIdx === -1 || dropIdx === -1) return;
    if (onReorder) onReorder(reorder(items, draggedIdx, dropIdx));
    setDraggedId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverId(null);
  }

  // Mobile touch handlers
  function handleTouchStart(idx: number) {
    setTouchStartIdx(idx);
    setDraggedId(items[idx].id);
  }

  function handleTouchMove(e: React.TouchEvent) {
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!target) return;
    const card = target.closest('[data-card-idx]') as HTMLElement | null;
    if (card) {
      const overIdx = Number(card.dataset.cardIdx);
      setTouchOverIdx(overIdx);
      setDragOverId(items[overIdx].id);
    } else {
      setTouchOverIdx(null);
      setDragOverId(null);
    }
  }

  function handleTouchEnd() {
    if (
      touchStartIdx !== null &&
      touchOverIdx !== null &&
      touchStartIdx !== touchOverIdx &&
      onReorder
    ) {
      onReorder(reorder(items, touchStartIdx, touchOverIdx));
    }
    setDraggedId(null);
    setDragOverId(null);
    setTouchStartIdx(null);
    setTouchOverIdx(null);
  }

  function handleDragOverAddCard(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverAddCard(true);
  }

  function handleDragLeaveAddCard(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverAddCard(false);
  }

  function handleDropAddCard(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverAddCard(false);
    const addCard = items.find(item => item.isAddCard);
    if (addCard?.onAddFiles) {
      addCard.onAddFiles();
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-8 w-full min-h-[320px] max-h-[calc(100vh-180px)] overflow-y-auto pb-40">
      {items.map((item, idx) =>
        item.isAddCard ? (
          <Card
            key="add-card"
            className={`flex flex-col items-center justify-center h-48 bg-white border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-[#22345A] transition-colors ${
              isDraggingOverAddCard ? 'border-primary ring-2 ring-primary' : ''
            }`}
            onClick={item.onAddFiles}
            onDragOver={handleDragOverAddCard}
            onDragLeave={handleDragLeaveAddCard}
            onDrop={handleDropAddCard}
            style={{ minWidth: 180 }}
          >
            <img src="/icons/upload-cloud.svg" alt="Upload" className="w-8 h-8 mb-2" />
            <span className="text-sm text-gray-700 dark:text-gray-200 text-center mb-2">Drag and drop<br />PDF files here</span>
            <button
              className="bg-red-500 hover:bg-red-600 text-white font-semibold rounded px-4 py-2 text-sm mt-2"
              disabled={item.isProcessing}
              onClick={e => {
                e.stopPropagation();
                item.onAddFiles?.();
              }}
            >
              Add PDF files
            </button>
          </Card>
        ) : (
          <Card
            key={item.id}
            draggable
            data-card-idx={idx}
            onDragStart={() => handleDragStart(item.id)}
            onDragOver={e => {
              e.preventDefault();
              if (draggedId && draggedId !== item.id) {
                handleDragOver(item.id);
              }
            }}
            onDrop={e => {
              e.preventDefault();
              handleDrop(item.id);
            }}
            onDragEnd={handleDragEnd}
            onTouchStart={() => handleTouchStart(idx)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`
              relative flex flex-col items-center h-48 bg-white dark:bg-[#22345A] rounded-xl shadow border border-gray-200 dark:border-gray-700 p-2
              transition-shadow
              ${draggedId === item.id ? 'border-2 border-blue-400 opacity-50' : ''}
              ${dragOverId === item.id && draggedId !== item.id ? 'border-2 border-blue-400 ring-2 ring-primary' : ''}
              cursor-move select-none
              touch-none
            `}
            style={{ minWidth: 180 }}
          >
            {item.onDelete && (
              <button
                className="absolute top-1 right-1 z-20 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={item.onDelete}
                tabIndex={-1}
                aria-label="Remove file"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            )}
            <div className="flex-1 flex items-center justify-center w-full">
              {item.preview ? (
                <img
                  src={item.preview}
                  alt={item.label}
                  onError={e => (e.currentTarget.style.display = 'none')}
                  className="object-contain w-full h-32 rounded"
                  draggable={false}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-32 flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs bg-gray-100 dark:bg-gray-800 rounded">Loading…</div>
              )}
            </div>
            <span className="block mt-2 text-xs text-center text-gray-900 dark:text-white truncate max-w-full" title={item.label}>
              {item.label}
            </span>
          </Card>
        )
      )}
    </div>
  );
} 
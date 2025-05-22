// Copyright © 2025 Anton Medvedev
// SPDX‑License‑Identifier: AGPL‑3.0

/// <reference lib="webworker" />
import * as Comlink from 'comlink'
import * as mupdf from "mupdf/mupdfjs"

export const MUPDF_LOADED = 'MUPDF_LOADED'
const OPEN_DOCUMENT_TIMEOUT = 10000; // 10 seconds timeout

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export class MupdfWorker {

  constructor() {
    this.initializeMupdf()
  }

  private async initializeMupdf() {
      postMessage(MUPDF_LOADED);
  }

  private async openDocumentWithTimeout(buffer: ArrayBuffer): Promise<mupdf.PDFDocument> {
    return withTimeout(
      Promise.resolve(mupdf.PDFDocument.openDocument(buffer, 'application/pdf')),
      OPEN_DOCUMENT_TIMEOUT
    );
  }

  async mergeDocuments(documents: ArrayBuffer[]): Promise<ArrayBuffer> {
    if (documents.length === 0) throw new Error('No documents to merge')

    const mergedDoc = await this.openDocumentWithTimeout(documents[0]);
    try {
      for (const buf of documents.slice(1)) {
        const src = await this.openDocumentWithTimeout(buf);
        mergedDoc.merge(src) // defaults: fromPage=0, toPage=-1, startAt=-1, rotate=0
        src.destroy();
      }
      
      const mergedDocument = await mergedDoc.saveToBuffer(
        "compress-images,compression-effort=90,image_dpi=150,image_quality=70," +
        "compress-fonts,garbage=4,color-lossy-image-subsample-dpi=150,"+
        "color-lossy-image-recompress-method=jpeg,"+
        "color-lossy-image-recompress-quality=70,",
      );
      return mergedDocument.asUint8Array();
    } finally {
      mergedDoc.destroy();
    }
  }

  async renderFirstPage(pdfBuffer: ArrayBuffer): Promise<string> {
    const doc = await this.openDocumentWithTimeout(pdfBuffer);
    try {
      const page = doc.loadPage(0);
      // Render at 144 DPI (2x 72dpi)
      const dpi = 144;
      const zoom = dpi / 72;
      const matrix = mupdf.Matrix.scale(zoom, zoom);
      const pix = page.toPixmap(
        matrix,
        mupdf.ColorSpace.DeviceRGB,
        false, // alpha: no transparency
        true   // showExtras: render annotations/widgets
      );
      const png = pix.asPNG();
      page.destroy();

      // Convert Uint8Array to base64 in chunks to avoid stack overflow
      const CHUNK_SIZE = 8192; // Process 8KB at a time
      let binary = '';
      for (let i = 0; i < png.length; i += CHUNK_SIZE) {
        const chunk = png.slice(i, i + CHUNK_SIZE);
        binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
      }
      const base64 = btoa(binary);
      return `data:image/png;base64,${base64}`;
    } finally {
      doc.destroy();
    }
  }

  async rotateDocument(pdfBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    try {
      const doc = mupdf.PDFDocument.openDocument(pdfBuffer, 'application/pdf');
      const pageCount = doc.countPages();
      for (let i = 0; i < pageCount; i++) {
        const page = doc.loadPage(i);
        page.rotate(90); // rotate 90 degrees to the right (clockwise)
        page.destroy();
      }
      const rotatedBuffer = await doc.saveToBuffer(
        "compress-images,compression-effort=90,image_dpi=150,image_quality=70," +
        "compress-fonts,garbage=4,color-lossy-image-subsample-dpi=150,"+
        "color-lossy-image-recompress-method=jpeg,"+
        "color-lossy-image-recompress-quality=70,",
      );
      doc.destroy();
      return rotatedBuffer.asUint8Array();
    } catch (error) {
      console.error('Error rotating document:', error);
      throw new Error('Failed to rotate document');
    }
  }
}

Comlink.expose(new MupdfWorker())

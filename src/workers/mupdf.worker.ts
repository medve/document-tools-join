// Copyright © 2025 Anton Medvedev
// SPDX‑License‑Identifier: AGPL‑3.0

/// <reference lib="webworker" />
import * as Comlink from 'comlink'
import * as mupdf from "mupdf/mupdfjs"

export const MUPDF_LOADED = 'MUPDF_LOADED'

export class MupdfWorker {

  constructor() {
    this.initializeMupdf()
  }

  private async initializeMupdf() {
      postMessage(MUPDF_LOADED);
  }

  async mergeDocuments(documents: ArrayBuffer[]): Promise<ArrayBuffer> {
    if (documents.length === 0) throw new Error('No documents to merge')

      const mergedDoc = mupdf.PDFDocument.openDocument(documents[0], 'application/pdf')
      for (const buf of documents.slice(1)) {
        const src = mupdf.PDFDocument.openDocument(buf, 'application/pdf')
        mergedDoc.merge(src) // defaults: fromPage=0, toPage=-1, startAt=-1, rotate=0
      }
      
      const mergedDocument = await mergedDoc.saveToBuffer(
        "compress-images,compression-effort=90,image_dpi=70,image_quality=40," +
        "compress-fonts,garbage=4,color-lossy-image-subsample-dpi=70,"+
        "color-lossy-image-recompress-method=jpeg,"+
        "color-lossy-image-recompress-quality=40,",
      );
      mergedDoc.destroy();
      
      return mergedDocument.asUint8Array();
  }

  async renderFirstPage(pdfBuffer: ArrayBuffer): Promise<string> {
      const doc = mupdf.PDFDocument.openDocument(pdfBuffer, 'application/pdf');
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
      doc.destroy();

      // Convert Uint8Array to base64 in chunks to avoid stack overflow
      const CHUNK_SIZE = 8192; // Process 8KB at a time
      let binary = '';
      for (let i = 0; i < png.length; i += CHUNK_SIZE) {
        const chunk = png.slice(i, i + CHUNK_SIZE);
        binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
      }
      const base64 = btoa(binary);
      return `data:image/png;base64,${base64}`;
  }
}

Comlink.expose(new MupdfWorker())

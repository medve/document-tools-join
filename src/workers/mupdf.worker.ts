/// <reference lib="webworker" />
import * as Comlink from 'comlink'
import * as mupdf from "mupdf/mupdfjs"

export const MUPDF_LOADED = 'MUPDF_LOADED'

export class MupdfWorker {

  constructor() {
    this.initializeMupdf()
  }

  private async initializeMupdf() {
    try {
      postMessage(MUPDF_LOADED);
    } catch (error) {
      console.error("Failed to initialize MuPDF:", error);
    }
  }

  async mergeDocuments(documents: ArrayBuffer[]): Promise<ArrayBuffer> {
    if (documents.length === 0) throw new Error('No documents to merge')

    try {
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
    } catch (error) {
      console.error('Error loading document:', error)
      throw new Error('Failed to load document')
    }
  }
}

Comlink.expose(new MupdfWorker())

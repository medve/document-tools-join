// Copyright © 2025 Anton Medvedev
// SPDX‑License‑Identifier: AGPL‑3.0

/// <reference lib="webworker" />
import * as Comlink from 'comlink'
import * as mupdf from "mupdf/mupdfjs"

export const MUPDF_LOADED = 'MUPDF_LOADED'
const OPEN_DOCUMENT_TIMEOUT = 10000; // 10 seconds timeout
const COMPRESSION_OPTIONS = "compress-images,compression-effort=90,image_dpi=150,image_quality=70," +
  "compress-fonts,garbage=2,color-lossy-image-subsample-dpi=150,"+
  "color-lossy-image-recompress-method=jpeg,"+
  "color-lossy-image-recompress-quality=70,";

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
      // Only send postMessage in actual worker environment, not in tests
      if (typeof WorkerGlobalScope !== 'undefined' && typeof importScripts === 'function') {
        postMessage(MUPDF_LOADED);
      }
  }

  private async openDocumentWithTimeout(buffer: ArrayBuffer): Promise<mupdf.PDFDocument> {
    return withTimeout(
      Promise.resolve(mupdf.PDFDocument.openDocument(buffer, 'application/pdf')),
      OPEN_DOCUMENT_TIMEOUT
    );
  }

  async mergeDocuments(documents: ArrayBuffer[]): Promise<ArrayBuffer> {
    if (documents.length === 0) throw new Error('No documents to merge');

    // Use hybrid approach to avoid page tree corruption while preserving links
    const mergedDoc = mupdf.PDFDocument.createBlankDocument();
    
    // Track page mappings for internal link remapping
    interface PageMapping {
      docIndex: number;
      originalPageIndex: number;
      newPageIndex: number;
    }
    const pageMappings: PageMapping[] = [];
    
    // Collect internal links to process after all pages are grafted
    interface InternalLink {
      newPageIndex: number;
      bounds: number[];
      originalURI: string;
      originalPageRef: number;
    }
    const internalLinks: InternalLink[] = [];
    
    try {
      for (let docIndex = 0; docIndex < documents.length; docIndex++) {
        const buf = documents[docIndex];
        const src = await this.openDocumentWithTimeout(buf);
        const pageCount = src.countPages();
        
        for (let i = 0; i < pageCount; i++) {
          // Graft the page content (preserves page dimensions and content)
          mergedDoc.graftPage(-1, src, i);
          
          // Get the destination page (last added page)
          const dstPageIndex = mergedDoc.countPages() - 1;
          
          // Record page mapping for internal link remapping
          pageMappings.push({
            docIndex,
            originalPageIndex: i,
            newPageIndex: dstPageIndex
          });
          
          const srcPage = src.loadPage(i);
          const dstPage = mergedDoc.loadPage(dstPageIndex);
          
          // Process links: copy external links immediately, collect internal links for later
          try {
            const links = srcPage.getLinks();
            for (const link of links) {
              if (link.isExternal()) {
                // Copy external links (URLs) immediately
                const bounds = link.getBounds();
                dstPage.insertLink({
                  x: bounds[0],
                  y: bounds[1], 
                  width: bounds[2] - bounds[0],
                  height: bounds[3] - bounds[1]
                }, link.getURI());
              } else {
                // Collect internal links for remapping after all pages are grafted
                const uri = link.getURI();
                if (uri && uri.includes('#page=')) {
                  const pageMatch = uri.match(/#page=(\d+)/);
                  if (pageMatch) {
                    const originalPageRef = parseInt(pageMatch[1]);
                    internalLinks.push({
                      newPageIndex: dstPageIndex,
                      bounds: link.getBounds(),
                      originalURI: uri,
                      originalPageRef: originalPageRef
                    });
                  }
                }
              }
            }
            
            // Copy non-link annotations (preserves forms and other annotations)
            // Internal links will be handled separately after all pages are grafted
            const srcPageObj = srcPage.getObject();
            const dstPageObj = dstPage.getObject();
            
            if (srcPageObj && dstPageObj) {
              const annots = srcPageObj.get('Annots');
              if (annots && annots.isArray() && annots.length > 0) {
                // Filter out link annotations but keep forms, widgets, etc.
                const filteredAnnots = mergedDoc.newArray();
                let hasNonLinkAnnotations = false;
                
                for (let j = 0; j < annots.length; j++) {
                  try {
                    const annotRef = annots.get(j);
                    if (annotRef && annotRef.isIndirect()) {
                      const annot = annotRef.resolve();
                      if (annot && annot.isDictionary()) {
                        const subtype = annot.get('Subtype');
                        // Skip link annotations, keep everything else
                        if (!subtype || !subtype.isName() || subtype.asName() !== 'Link') {
                          const graftedAnnot = mergedDoc.graftObject(annotRef);
                          filteredAnnots.push(graftedAnnot);
                          hasNonLinkAnnotations = true;
                        }
                      }
                    }
                  } catch (e) {
                    // If we can't process this annotation, skip it
                    console.warn(`Failed to process annotation ${j}:`, e);
                  }
                }
                
                // Only set annotations if we found non-link annotations
                if (hasNonLinkAnnotations) {
                  dstPageObj.put('Annots', filteredAnnots);
                }
              }
            }
          } catch (e) {
            // Continue if copying fails for a specific page
            console.warn(`Failed to copy annotations/links for page ${i}:`, e);
          }
          
          srcPage.destroy();
          dstPage.destroy();
        }
        
        src.destroy();
      }
      
      // Now process collected internal links with proper page remapping
      console.log(`Processing ${internalLinks.length} internal links for remapping...`);
      
      for (const internalLink of internalLinks) {
        try {
          // Find the correct remapped page number
          // Internal links reference pages within the same document they originated from
          const sourceMapping = pageMappings.find(mapping => 
            mapping.newPageIndex === internalLink.newPageIndex
          );
          
          if (sourceMapping) {
            // Find the target page in the same source document
            const targetMapping = pageMappings.find(mapping => 
              mapping.docIndex === sourceMapping.docIndex && 
              mapping.originalPageIndex === internalLink.originalPageRef - 1 // PDF pages are 1-indexed in URIs
            );
            
            if (targetMapping) {
              // Create remapped URI with new page number (convert back to 1-indexed)
              const newPageRef = targetMapping.newPageIndex + 1;
              const newURI = internalLink.originalURI.replace(
                /#page=\d+/,
                `#page=${newPageRef}`
              );
              
              // Add the remapped internal link to the destination page
              const dstPage = mergedDoc.loadPage(internalLink.newPageIndex);
              dstPage.insertLink({
                x: internalLink.bounds[0],
                y: internalLink.bounds[1],
                width: internalLink.bounds[2] - internalLink.bounds[0],
                height: internalLink.bounds[3] - internalLink.bounds[1]
              }, newURI);
              
              dstPage.destroy();
              
              console.log(`Remapped internal link: ${internalLink.originalURI} → ${newURI}`);
            } else {
              console.warn(`Could not find target page mapping for internal link: ${internalLink.originalURI}`);
            }
          }
        } catch (e) {
          console.warn(`Failed to remap internal link: ${internalLink.originalURI}`, e);
        }
      }
      
      // Remove the initial blank page if present
      if (mergedDoc.countPages() > 0) {
        try {
          const firstPage = mergedDoc.loadPage(0);
          const text = firstPage.getText();
          if (text.trim() === "") {
            mergedDoc.deletePage(0);
          }
        } catch {
          // If getText fails, keep the page
        }
      }
      
      const mergedDocument = await mergedDoc.saveToBuffer(COMPRESSION_OPTIONS);
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
      const rotatedBuffer = await doc.saveToBuffer(COMPRESSION_OPTIONS);
      doc.destroy();
      return rotatedBuffer.asUint8Array();
    } catch (error) {
      console.error('Error rotating document:', error);
      throw new Error('Failed to rotate document');
    }
  }
}

Comlink.expose(new MupdfWorker())

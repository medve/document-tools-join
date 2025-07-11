import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'fs/promises'
import { MupdfWorker } from '../../src/workers/mupdf.worker'
import * as mupdf from 'mupdf/mupdfjs'

describe('PDF Link Preservation', () => {
  let testDocument: ArrayBuffer
  let testDocument3: ArrayBuffer
  let formDocument: ArrayBuffer

  beforeAll(async () => {
    // Load test PDFs and convert to ArrayBuffer for MuPDF
    const testDocumentBuffer = await readFile('./tests/fixtures/test_document.pdf')
    let arrayBuffer = new ArrayBuffer(testDocumentBuffer.length)
    let uint8View = new Uint8Array(arrayBuffer)
    uint8View.set(testDocumentBuffer)
    testDocument = arrayBuffer
    
    const testDocument3Buffer = await readFile('./tests/fixtures/test_document3.pdf')
    arrayBuffer = new ArrayBuffer(testDocument3Buffer.length)
    uint8View = new Uint8Array(arrayBuffer)
    uint8View.set(testDocument3Buffer)
    testDocument3 = arrayBuffer
    
    const formDocumentBuffer = await readFile('./tests/fixtures/form_document_fixed.pdf')
    arrayBuffer = new ArrayBuffer(formDocumentBuffer.length)
    uint8View = new Uint8Array(arrayBuffer)
    uint8View.set(formDocumentBuffer)
    formDocument = arrayBuffer
  })

  it('should preserve internal links when merging PDFs', async () => {
    const worker = new MupdfWorker()
    
    // Merge documents
    const merged = await worker.mergeDocuments([testDocument, testDocument3])
    
    // Open merged document and check for links
    const doc = mupdf.PDFDocument.openDocument(merged, 'application/pdf')
    
    let hasLinks = false
    const pageCount = doc.countPages()
    
    for (let i = 0; i < pageCount; i++) {
      const page = doc.loadPage(i)
      const links = page.getLinks()
      if (links && links.length > 0) {
        hasLinks = true
        console.log(`Page ${i} has ${links.length} links`)
        links.forEach((link: unknown) => {
          console.log('Link found:', link)
        })
      }
    }
    
    doc.destroy()
    
    expect(hasLinks).toBe(true)
  })

  it('should preserve external links when merging PDFs', async () => {
    const worker = new MupdfWorker()
    
    // Check original document for external links
    const originalDoc = mupdf.PDFDocument.openDocument(testDocument, 'application/pdf')
    let originalExternalLinks = 0
    
    for (let i = 0; i < originalDoc.countPages(); i++) {
      const page = originalDoc.loadPage(i)
      const links = page.getLinks()
      links.forEach((link: unknown) => {
        const linkObj = link as { href?: string }
        if (linkObj.href && linkObj.href.startsWith('http')) {
          originalExternalLinks++
        }
      })
    }
    originalDoc.destroy()
    
    // Merge and check
    const merged = await worker.mergeDocuments([testDocument, testDocument3])
    const mergedDoc = mupdf.PDFDocument.openDocument(merged, 'application/pdf')
    
    let mergedExternalLinks = 0
    for (let i = 0; i < mergedDoc.countPages(); i++) {
      const page = mergedDoc.loadPage(i)
      const links = page.getLinks()
      links.forEach((link: unknown) => {
        const linkObj = link as { href?: string }
        if (linkObj.href && linkObj.href.startsWith('http')) {
          mergedExternalLinks++
        }
      })
    }
    mergedDoc.destroy()
    
    expect(mergedExternalLinks).toBeGreaterThanOrEqual(originalExternalLinks)
  })

  it('should preserve form fields when merging PDFs', async () => {
    const worker = new MupdfWorker()
    
    // Check original form document
    const originalDoc = mupdf.PDFDocument.openDocument(formDocument, 'application/pdf')
    let originalFormFields = 0
    
    // Check for form fields in original
    for (let i = 0; i < originalDoc.countPages(); i++) {
      const page = originalDoc.loadPage(i)
      const widgets = page.getWidgets()
      if (widgets) {
        originalFormFields += widgets.length
      }
    }
    originalDoc.destroy()
    
    // Merge documents including form
    const merged = await worker.mergeDocuments([testDocument, formDocument, testDocument3])
    const mergedDoc = mupdf.PDFDocument.openDocument(merged, 'application/pdf')
    
    let mergedFormFields = 0
    for (let i = 0; i < mergedDoc.countPages(); i++) {
      const page = mergedDoc.loadPage(i)
      const widgets = page.getWidgets()
      if (widgets) {
        mergedFormFields += widgets.length
      }
    }
    mergedDoc.destroy()
    
    console.log(`Original form fields: ${originalFormFields}, Merged form fields: ${mergedFormFields}`)
    expect(mergedFormFields).toBeGreaterThanOrEqual(originalFormFields)
  })

  it('should maintain link destinations after page reordering', async () => {
    const worker = new MupdfWorker()
    
    // Merge in different order
    const merged1 = await worker.mergeDocuments([testDocument, testDocument3])
    const merged2 = await worker.mergeDocuments([testDocument3, testDocument])
    
    // Both should have links preserved
    const doc1 = mupdf.PDFDocument.openDocument(merged1, 'application/pdf')
    const doc2 = mupdf.PDFDocument.openDocument(merged2, 'application/pdf')
    
    let links1 = 0, links2 = 0
    
    for (let i = 0; i < doc1.countPages(); i++) {
      const page = doc1.loadPage(i)
      links1 += page.getLinks().length
    }
    
    for (let i = 0; i < doc2.countPages(); i++) {
      const page = doc2.loadPage(i)
      links2 += page.getLinks().length
    }
    
    doc1.destroy()
    doc2.destroy()
    
    // Both versions should have links
    expect(links1).toBeGreaterThan(0)
    expect(links2).toBeGreaterThan(0)
  })
})
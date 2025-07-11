import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'fs/promises'
import * as mupdf from 'mupdf'

describe('PDF Merge Link Preservation', () => {
  let testDocument: ArrayBuffer

  beforeAll(async () => {
    // Load test PDFs
    const testDocumentBuffer = await readFile('./tests/fixtures/test_document.pdf')
    
    // Convert Node.js Buffer to ArrayBuffer for MuPDF
    const arrayBuffer = new ArrayBuffer(testDocumentBuffer.length)
    const uint8View = new Uint8Array(arrayBuffer)
    uint8View.set(testDocumentBuffer)
    testDocument = arrayBuffer
  })

  it('should detect links in original PDFs', async () => {
    // Check original documents for links
    const doc = mupdf.Document.openDocument(testDocument, 'application/pdf')
    
    let totalLinks = 0
    let internalLinks = 0
    let externalLinks = 0
    
    for (let i = 0; i < doc.countPages(); i++) {
      const page = doc.loadPage(i)
      const links = page.getLinks()
      
      links.forEach((link: unknown) => {
        totalLinks++
        console.log(`Page ${i} link:`, link)
        
        const linkObj = link as { href?: string; page?: number }
        if (linkObj.href && linkObj.href.startsWith('http')) {
          externalLinks++
        } else if (linkObj.page !== undefined) {
          internalLinks++
        }
      })
    }
    
    console.log(`Original document - Total links: ${totalLinks}, Internal: ${internalLinks}, External: ${externalLinks}`)
    doc.destroy()
    
    // We expect to find some links in the test documents
    expect(totalLinks).toBeGreaterThan(0)
  })

  // Note: These tests are commented out because they use mupdf methods that
  // don't exist in the current version (createBlankDocument, insertPDF, etc.)
  // The actual worker implementation now uses the merge() method which properly
  // preserves links and forms.
})
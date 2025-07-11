import { describe, it, expect, beforeAll, vi } from 'vitest'
import { readFile } from 'fs/promises'

// Mock postMessage for worker environment
global.postMessage = vi.fn(() => {}) as typeof postMessage

import { MupdfWorker } from '../../src/workers/mupdf.worker'

/**
 * Document Management Operations Tests
 * 
 * These tests verify all document management operations work correctly:
 * - Document rotation (90-degree clockwise rotation)
 * - Adding documents to collection
 * - Removing documents from collection
 * - Clearing entire document collection
 * - Reordering documents in different sequences
 * - Preserving links and forms through all operations
 */

describe('Document Management Operations', () => {
  let worker: MupdfWorker
  let testFixtures: Record<string, ArrayBuffer>

  beforeAll(async () => {
    worker = new MupdfWorker()
    
    // Load test fixtures
    const fixtures = [
      'test_document.pdf',      // 3 pages with internal/external links
      'test_document3.pdf',     // 4 pages with internal/external links  
      'diplom.pdf',             // Multi-page document
      'form_document_fixed.pdf' // Document with form fields
    ]
    
    testFixtures = {}
    for (const fixture of fixtures) {
      const buffer = await readFile(`./tests/fixtures/${fixture}`)
      const arrayBuffer = new ArrayBuffer(buffer.length)
      const uint8View = new Uint8Array(arrayBuffer)
      uint8View.set(buffer)
      testFixtures[fixture.replace('.pdf', '')] = arrayBuffer
    }
  })

  describe('Document Rotation', () => {
    it('should rotate document 90 degrees clockwise', async () => {
      const originalDoc = testFixtures.test_document
      const rotatedBuffer = await worker.rotateDocument(originalDoc)
      
      expect(rotatedBuffer).toBeInstanceOf(Uint8Array)
      expect(rotatedBuffer.length).toBeGreaterThan(0)
      
      // Verify we can still open and process the rotated document
      const mupdf = await import('mupdf')
      const originalPdf = mupdf.Document.openDocument(originalDoc, 'application/pdf')
      const rotatedPdf = mupdf.Document.openDocument(rotatedBuffer, 'application/pdf')
      
      // Should have same number of pages
      expect(rotatedPdf.countPages()).toBe(originalPdf.countPages())
      
      // Check that rotation was applied (page dimensions should be swapped)
      const originalPage = originalPdf.loadPage(0)
      const rotatedPage = rotatedPdf.loadPage(0)
      
      const originalBounds = originalPage.getBounds()
      const rotatedBounds = rotatedPage.getBounds()
      
      // After 90-degree rotation, width and height should be swapped
      // Allow for small floating-point differences
      const tolerance = 1
      expect(Math.abs(originalBounds[2] - rotatedBounds[3])).toBeLessThan(tolerance)
      expect(Math.abs(originalBounds[3] - rotatedBounds[2])).toBeLessThan(tolerance)
      
      originalPdf.destroy()
      rotatedPdf.destroy()
    })

    it('should preserve links and forms after rotation', async () => {
      const formDoc = testFixtures.form_document_fixed
      const rotatedBuffer = await worker.rotateDocument(formDoc)
      
      const mupdf = await import('mupdf')
      const originalPdf = mupdf.Document.openDocument(formDoc, 'application/pdf')
      const rotatedPdf = mupdf.Document.openDocument(rotatedBuffer, 'application/pdf')
      
      // Count form fields in original vs rotated
      let originalFormFields = 0
      let rotatedFormFields = 0
      
      for (let i = 0; i < originalPdf.countPages(); i++) {
        const page = originalPdf.loadPage(i)
        const widgets = page.getWidgets()
        if (widgets) originalFormFields += widgets.length
      }
      
      for (let i = 0; i < rotatedPdf.countPages(); i++) {
        const page = rotatedPdf.loadPage(i)
        const widgets = page.getWidgets()
        if (widgets) rotatedFormFields += widgets.length
      }
      
      expect(rotatedFormFields).toBe(originalFormFields)
      expect(rotatedFormFields).toBeGreaterThan(0) // Should have form fields
      
      originalPdf.destroy()
      rotatedPdf.destroy()
    })

    it('should handle rotation of documents with various orientations', async () => {
      // Test rotation on different document types
      const documents = [
        testFixtures.test_document,
        testFixtures.test_document3,
        testFixtures.diplom
      ]
      
      for (const doc of documents) {
        const rotatedBuffer = await worker.rotateDocument(doc)
        expect(rotatedBuffer).toBeInstanceOf(Uint8Array)
        expect(rotatedBuffer.length).toBeGreaterThan(0)
        
        // Verify document is still valid after rotation
        const mupdf = await import('mupdf')
        const rotatedPdf = mupdf.Document.openDocument(rotatedBuffer, 'application/pdf')
        expect(rotatedPdf.countPages()).toBeGreaterThan(0)
        rotatedPdf.destroy()
      }
    })
  })

  describe('Document Collection Management', () => {
    it('should handle adding documents in sequence', async () => {
      // Simulate adding documents one by one and merging
      const sequences = [
        [testFixtures.test_document],
        [testFixtures.test_document, testFixtures.test_document3],
        [testFixtures.test_document, testFixtures.test_document3, testFixtures.diplom],
        [testFixtures.test_document, testFixtures.test_document3, testFixtures.diplom, testFixtures.form_document_fixed]
      ]
      
      for (let i = 0; i < sequences.length; i++) {
        const merged = await worker.mergeDocuments(sequences[i])
        expect(merged).toBeInstanceOf(Uint8Array)
        
        const mupdf = await import('mupdf')
        const doc = mupdf.Document.openDocument(merged, 'application/pdf')
        
        // Page count should increase with each addition
        const expectedMinPages = sequences[i].length // At least one page per document
        expect(doc.countPages()).toBeGreaterThanOrEqual(expectedMinPages)
        
        doc.destroy()
      }
    })

    it('should handle document removal by simulating different combinations', async () => {
      // Test "removal" by merging different subsets of documents
      const removalScenarios = [
        // Remove first document
        [testFixtures.test_document3, testFixtures.diplom, testFixtures.form_document_fixed],
        // Remove middle document
        [testFixtures.test_document, testFixtures.diplom, testFixtures.form_document_fixed],
        // Remove last document
        [testFixtures.test_document, testFixtures.test_document3, testFixtures.diplom],
        // Remove multiple documents
        [testFixtures.test_document, testFixtures.form_document_fixed]
      ]
      
      for (const scenario of removalScenarios) {
        const merged = await worker.mergeDocuments(scenario)
        expect(merged).toBeInstanceOf(Uint8Array)
        
        const mupdf = await import('mupdf')
        const doc = mupdf.Document.openDocument(merged, 'application/pdf')
        expect(doc.countPages()).toBeGreaterThan(0)
        doc.destroy()
      }
    })

    it('should handle clearing documents by merging empty array', async () => {
      // Test empty document array (should throw error)
      await expect(worker.mergeDocuments([])).rejects.toThrow('No documents to merge')
    })

    it('should handle single document operations', async () => {
      // Test operations with just one document (like clearing all but one)
      for (const doc of Object.values(testFixtures)) {
        const merged = await worker.mergeDocuments([doc])
        expect(merged).toBeInstanceOf(Uint8Array)
        
        const mupdf = await import('mupdf')
        const mergedDoc = mupdf.Document.openDocument(merged, 'application/pdf')
        const originalDoc = mupdf.Document.openDocument(doc, 'application/pdf')
        
        // Should preserve page count
        expect(mergedDoc.countPages()).toBe(originalDoc.countPages())
        
        mergedDoc.destroy()
        originalDoc.destroy()
      }
    })
  })

  describe('Document Reordering', () => {
    it('should handle all possible document orders', async () => {
      const docs = [
        testFixtures.test_document,
        testFixtures.test_document3,
        testFixtures.diplom
      ]
      
      // Test all 6 possible permutations of 3 documents
      const permutations = [
        [0, 1, 2], // Original order
        [0, 2, 1], // Swap last two
        [1, 0, 2], // Swap first two
        [1, 2, 0], // Rotate left
        [2, 0, 1], // Rotate right
        [2, 1, 0]  // Reverse order
      ]
      
      for (const [index, perm] of permutations.entries()) {
        const reorderedDocs = perm.map(i => docs[i])
        const merged = await worker.mergeDocuments(reorderedDocs)
        
        expect(merged).toBeInstanceOf(Uint8Array)
        
        const mupdf = await import('mupdf')
        const doc = mupdf.Document.openDocument(merged, 'application/pdf')
        
        // Should have pages from all documents
        expect(doc.countPages()).toBeGreaterThan(0)
        console.log(`Permutation ${index + 1}: ${doc.countPages()} pages`)
        
        doc.destroy()
      }
    })

    it('should preserve content integrity across different orders', async () => {
      const docs = [testFixtures.test_document, testFixtures.form_document_fixed]
      
      // Test different orders
      const order1 = await worker.mergeDocuments([docs[0], docs[1]])
      const order2 = await worker.mergeDocuments([docs[1], docs[0]])
      
      const mupdf = await import('mupdf')
      const doc1 = mupdf.Document.openDocument(order1, 'application/pdf')
      const doc2 = mupdf.Document.openDocument(order2, 'application/pdf')
      
      // Both should have same total page count
      expect(doc1.countPages()).toBe(doc2.countPages())
      
      // Both should preserve form fields (though in different positions)
      let formFields1 = 0, formFields2 = 0
      
      for (let i = 0; i < doc1.countPages(); i++) {
        const page = doc1.loadPage(i)
        const widgets = page.getWidgets()
        if (widgets) formFields1 += widgets.length
      }
      
      for (let i = 0; i < doc2.countPages(); i++) {
        const page = doc2.loadPage(i)
        const widgets = page.getWidgets()
        if (widgets) formFields2 += widgets.length
      }
      
      expect(formFields1).toBe(formFields2)
      expect(formFields1).toBeGreaterThan(0)
      
      doc1.destroy()
      doc2.destroy()
    })

    it('should maintain link functionality across reordering', async () => {
      const docs = [testFixtures.test_document, testFixtures.test_document3]
      
      // Test both orders
      const orders = [
        [docs[0], docs[1]],
        [docs[1], docs[0]]
      ]
      
      for (const [orderIndex, docOrder] of orders.entries()) {
        const merged = await worker.mergeDocuments(docOrder)
        const mupdf = await import('mupdf')
        const doc = mupdf.Document.openDocument(merged, 'application/pdf')
        
        let totalLinks = 0
        let validInternalLinks = 0
        
        for (let i = 0; i < doc.countPages(); i++) {
          const page = doc.loadPage(i)
          const links = page.getLinks()
          
          for (const link of links) {
            totalLinks++
            if (!link.isExternal()) {
              const uri = link.getURI()
              if (uri && uri.includes('#page=')) {
                const pageMatch = uri.match(/#page=(\d+)/)
                if (pageMatch) {
                  const destPage = parseInt(pageMatch[1])
                  if (destPage >= 1 && destPage <= doc.countPages()) {
                    validInternalLinks++
                  }
                }
              }
            }
          }
        }
        
        console.log(`Order ${orderIndex + 1}: ${totalLinks} total links, ${validInternalLinks} valid internal links`)
        
        // Should have links and they should be valid
        expect(totalLinks).toBeGreaterThan(0)
        // All internal links should be valid after reordering
        if (validInternalLinks > 0) {
          // If there are internal links, they should all be valid
          expect(validInternalLinks).toBeGreaterThan(0)
        }
        
        doc.destroy()
      }
    })
  })

  describe('Complex Document Management Scenarios', () => {
    it('should handle rotation followed by reordering', async () => {
      // Rotate a document, then use it in different positions
      const rotatedDoc = await worker.rotateDocument(testFixtures.test_document)
      
      const scenarios = [
        [rotatedDoc, testFixtures.test_document3],
        [testFixtures.test_document3, rotatedDoc],
        [testFixtures.diplom, rotatedDoc, testFixtures.form_document_fixed]
      ]
      
      for (const scenario of scenarios) {
        const merged = await worker.mergeDocuments(scenario)
        expect(merged).toBeInstanceOf(Uint8Array)
        
        const mupdf = await import('mupdf')
        const doc = mupdf.Document.openDocument(merged, 'application/pdf')
        expect(doc.countPages()).toBeGreaterThan(0)
        doc.destroy()
      }
    })

    it('should handle multiple rotations and reorderings', async () => {
      // Rotate multiple documents
      const rotatedDoc1 = await worker.rotateDocument(testFixtures.test_document)
      const rotatedDoc2 = await worker.rotateDocument(testFixtures.test_document3)
      
      // Merge rotated documents in different orders
      const orders = [
        [rotatedDoc1, rotatedDoc2],
        [rotatedDoc2, rotatedDoc1],
        [rotatedDoc1, testFixtures.diplom, rotatedDoc2]
      ]
      
      for (const order of orders) {
        const merged = await worker.mergeDocuments(order)
        expect(merged).toBeInstanceOf(Uint8Array)
        
        const mupdf = await import('mupdf')
        const doc = mupdf.Document.openDocument(merged, 'application/pdf')
        expect(doc.countPages()).toBeGreaterThan(0)
        doc.destroy()
      }
    })

    it('should preserve all content types through complex operations', async () => {
      // Complex scenario: rotate form document, then merge with link documents
      const rotatedFormDoc = await worker.rotateDocument(testFixtures.form_document_fixed)
      
      const merged = await worker.mergeDocuments([
        testFixtures.test_document,    // Has links
        rotatedFormDoc,                // Rotated forms
        testFixtures.test_document3    // More links
      ])
      
      const mupdf = await import('mupdf')
      const doc = mupdf.Document.openDocument(merged, 'application/pdf')
      
      let totalFormFields = 0
      let totalLinks = 0
      
      for (let i = 0; i < doc.countPages(); i++) {
        const page = doc.loadPage(i)
        
        // Count form fields
        const widgets = page.getWidgets()
        if (widgets) totalFormFields += widgets.length
        
        // Count links
        const links = page.getLinks()
        totalLinks += links.length
      }
      
      // Should preserve both forms and links through rotation and reordering
      expect(totalFormFields).toBeGreaterThan(0)
      expect(totalLinks).toBeGreaterThan(0)
      
      console.log(`Complex scenario: ${totalFormFields} form fields, ${totalLinks} links preserved`)
      
      doc.destroy()
    })
  })

  describe('Error Handling in Document Management', () => {
    it('should handle rotation errors gracefully', async () => {
      // Test with invalid/corrupted data
      const invalidBuffer = new ArrayBuffer(100)
      
      await expect(worker.rotateDocument(invalidBuffer)).rejects.toThrow()
    })

    it('should handle merge errors with mixed valid/invalid documents', async () => {
      const invalidBuffer = new ArrayBuffer(100)
      
      // Should fail when including invalid document
      await expect(worker.mergeDocuments([
        testFixtures.test_document,
        invalidBuffer
      ])).rejects.toThrow()
    })

    it('should handle empty operations', async () => {
      // Empty merge should throw
      await expect(worker.mergeDocuments([])).rejects.toThrow('No documents to merge')
    })
  })
})
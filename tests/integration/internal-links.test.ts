import { describe, it, expect, beforeAll, vi } from 'vitest'
import { readFile } from 'fs/promises'

// Mock postMessage for worker environment
global.postMessage = vi.fn(() => {}) as typeof postMessage

import { MupdfWorker } from '../../src/workers/mupdf.worker'

/**
 * Internal Link Navigation Tests
 * 
 * These tests verify that internal page links work correctly after PDF merging.
 * Internal links should navigate to the correct pages in the merged document,
 * with page numbers properly remapped after grafting.
 */

describe('Internal Link Navigation Tests', () => {
  let worker: MupdfWorker
  let testFixtures: Record<string, ArrayBuffer>

  beforeAll(async () => {
    worker = new MupdfWorker()
    
    // Load test fixtures
    const fixtures = [
      'test_document.pdf',      // Should have internal links
      'test_document3.pdf',     // Should have internal links  
      'diplom.pdf',             // Multi-page document
      'form_document_fixed.pdf' // Document with forms
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

  describe('Internal Link Destination Mapping', () => {
    it('should remap internal link destinations after merging', async () => {
      // Test case: merge test_document3 (which has internal links) with other docs
      const merged = await worker.mergeDocuments([
        testFixtures.diplom,          // Pages 0-N in merged doc
        testFixtures.test_document3,  // Pages N+1-M in merged doc  
        testFixtures.test_document    // Pages M+1-end in merged doc
      ])
      
      const mupdf = await import('mupdf')
      const doc = mupdf.Document.openDocument(merged, 'application/pdf')
      
      let internalLinksFound = 0
      let validDestinations = 0
      let invalidDestinations = 0
      const linkDetails: Array<{
        page: number, 
        isInternal: boolean, 
        destination: string | number | null,
        isValid: boolean
      }> = []
      
      for (let i = 0; i < doc.countPages(); i++) {
        const page = doc.loadPage(i)
        const links = page.getLinks()
        
        for (const link of links) {
          if (!link.isExternal()) {
            internalLinksFound++
            
            // Try to get the destination page
            let destination: string | number | null = null
            let isValid = false
            
            try {
              // Get the URI to check what kind of link this is
              const uri = link.getURI()
              console.log(`  Link on page ${i}: URI="${uri}", isExternal=${link.isExternal()}`)
              
              if (uri && uri.includes('#page=')) {
                const pageMatch = uri.match(/#page=(\d+)/)
                if (pageMatch) {
                  destination = parseInt(pageMatch[1])
                  // Check if the destination page number is valid (1-indexed in URI, 0-indexed in doc)
                  isValid = destination >= 1 && destination <= doc.countPages()
                  console.log(`    Internal link: URI page ${destination}, doc has ${doc.countPages()} pages, valid=${isValid}`)
                }
              } else if (typeof (link as { getPage?: () => number }).getPage === 'function') {
                destination = (link as { getPage: () => number }).getPage()
                isValid = destination >= 0 && destination < doc.countPages()
              } else if (typeof (link as { getDestination?: () => unknown }).getDestination === 'function') {
                destination = (link as { getDestination: () => unknown }).getDestination()
                isValid = destination !== null
              }
              
              if (isValid) validDestinations++
              else invalidDestinations++
              
            } catch (error) {
              invalidDestinations++
              console.log(`Error checking link destination:`, error)
            }
            
            linkDetails.push({
              page: i,
              isInternal: true,
              destination,
              isValid
            })
          }
        }
      }
      
      doc.destroy()
      
      console.log(`Internal link analysis:`)
      console.log(`  Total internal links found: ${internalLinksFound}`)
      console.log(`  Valid destinations: ${validDestinations}`)
      console.log(`  Invalid destinations: ${invalidDestinations}`)
      
      linkDetails.forEach(({ page, destination, isValid }, index) => {
        console.log(`  Link ${index + 1} on page ${page}: dest=${destination}, valid=${isValid}`)
      })
      
      // Expectations
      expect(internalLinksFound).toBeGreaterThan(0) // Should find internal links
      
      // CRITICAL: After proper remapping, ALL internal links should have valid destinations
      // This test will fail with current implementation and pass after fix
      expect(validDestinations).toBe(internalLinksFound) // All internal links should be valid
      expect(invalidDestinations).toBe(0) // No invalid destinations after remapping
    })

    it('should preserve internal links within single document', async () => {
      // Test that internal links work correctly when merging just one document
      const merged = await worker.mergeDocuments([testFixtures.test_document3])
      
      const mupdf = await import('mupdf')
      const originalDoc = mupdf.Document.openDocument(testFixtures.test_document3, 'application/pdf')
      const mergedDoc = mupdf.Document.openDocument(merged, 'application/pdf')
      
      // Count internal links in original vs merged
      let originalInternalLinks = 0
      let mergedInternalLinks = 0
      
      for (let i = 0; i < originalDoc.countPages(); i++) {
        const page = originalDoc.loadPage(i)
        const links = page.getLinks()
        for (const link of links) {
          if (!link.isExternal()) originalInternalLinks++
        }
      }
      
      for (let i = 0; i < mergedDoc.countPages(); i++) {
        const page = mergedDoc.loadPage(i)
        const links = page.getLinks()
        for (const link of links) {
          if (!link.isExternal()) mergedInternalLinks++
        }
      }
      
      originalDoc.destroy()
      mergedDoc.destroy()
      
      console.log(`Single document merge - Original: ${originalInternalLinks}, Merged: ${mergedInternalLinks}`)
      
      // Should preserve all internal links even in single document merge
      expect(mergedInternalLinks).toBe(originalInternalLinks)
    })

    it('should handle complex page reordering with internal links', async () => {
      // Test merging multiple documents with internal links in different orders
      const scenarios = [
        [testFixtures.test_document3, testFixtures.diplom, testFixtures.test_document],
        [testFixtures.diplom, testFixtures.test_document3, testFixtures.form_document_fixed],
        [testFixtures.test_document, testFixtures.test_document3, testFixtures.diplom]
      ]
      
      for (let scenarioIndex = 0; scenarioIndex < scenarios.length; scenarioIndex++) {
        const scenario = scenarios[scenarioIndex]
        const merged = await worker.mergeDocuments(scenario)
        
        const mupdf = await import('mupdf')
        const doc = mupdf.Document.openDocument(merged, 'application/pdf')
        
        let internalLinksFound = 0
        let validLinks = 0
        
        for (let i = 0; i < doc.countPages(); i++) {
          const page = doc.loadPage(i)
          const links = page.getLinks()
          
          for (const link of links) {
            if (!link.isExternal()) {
              internalLinksFound++
              
              // Check if destination is valid (within document bounds)
              try {
                const uri = link.getURI()
                if (uri && uri.includes('#page=')) {
                  const pageMatch = uri.match(/#page=(\d+)/)
                  if (pageMatch) {
                    const destPage = parseInt(pageMatch[1])
                    if (destPage >= 1 && destPage <= doc.countPages()) {
                      validLinks++
                    }
                  }
                }
              } catch {
                // Link validation failed
              }
            }
          }
        }
        
        doc.destroy()
        
        console.log(`Scenario ${scenarioIndex + 1}: ${internalLinksFound} internal links, ${validLinks} valid`)
        
        // After proper implementation, all internal links should be valid
        if (internalLinksFound > 0) {
          expect(validLinks).toBe(internalLinksFound)
        }
      }
    })
  })

  describe('Link Destination Analysis', () => {
    it('should provide detailed analysis of link types and destinations', async () => {
      // Analyze the original test documents to understand their link structure
      const mupdf = await import('mupdf')
      
      const documents = ['test_document', 'test_document3']
      const analysis = []
      
      for (const docName of documents) {
        const doc = mupdf.Document.openDocument(testFixtures[docName], 'application/pdf')
        const docAnalysis = {
          name: docName,
          pages: doc.countPages(),
          links: []
        }
        
        for (let i = 0; i < doc.countPages(); i++) {
          const page = doc.loadPage(i)
          const links = page.getLinks()
          
          for (const link of links) {
            const linkInfo = {
              page: i,
              isExternal: link.isExternal(),
              uri: link.getURI(),
              bounds: link.getBounds()
            }
            
            docAnalysis.links.push(linkInfo)
          }
        }
        
        doc.destroy()
        analysis.push(docAnalysis)
      }
      
      // Log the analysis for debugging
      console.log('\\nDocument link analysis:')
      analysis.forEach(doc => {
        console.log(`\\n${doc.name} (${doc.pages} pages):`)
        doc.links.forEach((link, index) => {
          console.log(`  Link ${index + 1}: Page ${link.page}, External: ${link.isExternal}, URI: ${link.uri}`)
        })
      })
      
      // Verify we have the expected link structure for testing
      const totalLinks = analysis.reduce((sum, doc) => sum + doc.links.length, 0)
      expect(totalLinks).toBeGreaterThan(0) // Should have links to test with
    })
  })
})
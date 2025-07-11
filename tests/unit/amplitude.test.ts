import { describe, it, expect, vi } from 'vitest'
import { trackEvent, trackError } from '../../src/lib/amplitude'

describe('Amplitude tracking in tests', () => {
  it('should not track events during test runs', () => {
    // Mock console to capture any potential tracking calls
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    // These should not throw errors and should not send any tracking events
    trackEvent('test_event', { test: true })
    trackError('test error', { test: true })
    
    // Verify no console calls were made (indicating tracking was skipped)
    expect(consoleSpy).not.toHaveBeenCalled()
    
    consoleSpy.mockRestore()
  })
  
  it('should handle tracking calls gracefully in test environment', () => {
    // These calls should not throw any errors
    expect(() => {
      trackEvent('app_loaded')
      trackEvent('file_uploaded', { fileCount: 1 })
      trackError(new Error('Test error'))
    }).not.toThrow()
  })
})
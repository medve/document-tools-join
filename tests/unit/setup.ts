import '@testing-library/jest-dom'

// Ensure test environment is properly identified
Object.defineProperty(globalThis, 'vi', {
  value: true,
  writable: false
})
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a PDF Joiner tool that allows users to merge multiple PDF documents into a single file. It works both as a Chrome extension and a standalone web application. The project uses React 18, TypeScript, Vite, and the MuPDF library for PDF processing.

## Essential Commands

```bash
# Development
yarn dev          # Start Vite dev server at localhost:5173
yarn build        # TypeScript check + production build to dist/
yarn lint         # Run ESLint with max warnings 0
yarn format       # Format code with Prettier

# Testing
yarn test         # Run all tests with Vitest
yarn test:ui      # Run tests with UI interface
```

## Code Patterns and Conventions

Follow existing patterns from `.cursorrules`:
- Use functional TypeScript components with interfaces (not types)
- Use descriptive variable names (isLoading, hasError)
- Import assets with proper suffixes: `?url` for images, `?react` for SVG components
- Prefer Shadcn UI components and Tailwind CSS
- Avoid classes, enums, and unnecessary state

## Architecture Overview

### Core Technologies
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS with Shadcn UI components
- **PDF Processing**: MuPDF library running in Web Workers
- **State Management**: React hooks (useState, useEffect)
- **Internationalization**: i18next with 50+ language support
- **Analytics**: Amplitude for usage tracking

### Key Architectural Decisions

1. **Web Worker for PDF Processing**: Heavy PDF operations are offloaded to a Web Worker (`src/workers/join-pdf-worker.ts`) to keep the UI responsive. Communication happens via postMessage.

2. **Chrome Extension Architecture**: 
   - Manifest V3 with service worker (`public/background.js`)
   - Content scripts inject the PDF joiner into web pages
   - Supports both extension popup and full-page modes

3. **Drag & Drop System**: Uses @dnd-kit for file reordering with sortable containers and drag overlay components.

4. **Component Structure**:
   - `App.tsx`: Main application logic and state management
   - `components/ui/`: Reusable UI components (Shadcn)
   - Custom hooks in `src/hooks/` for window size detection and other utilities

5. **File Processing Flow**:
   - Files are uploaded via drag & drop or file input
   - PDFs are parsed and thumbnails generated using MuPDF
   - Users can reorder and rotate PDFs
   - Join operation combines PDFs in Web Worker
   - Final PDF is downloaded to user's device

### Important Implementation Details

- **PDF Processing**: The MuPDF library is loaded as a WASM module in the Web Worker. All PDF operations (parsing, rendering, joining) happen there.
- **PDF Merge Strategy**: Uses hybrid approach to preserve content without corruption:
  - Manual page grafting via `graftPage()` for reliable merging
  - External link preservation via `insertLink()` for clickable URLs
  - Form field preservation via `graftObject()` for interactive elements
  - Skips internal page links to prevent "page tree" corruption errors
- **Internationalization**: Language detection happens automatically based on browser settings. All UI strings are in translation files under `public/_locales/`.
- **State Management**: No Redux/Zustand - simple React state with proper separation of concerns.
- **Error Handling**: PDF processing errors are caught in the worker and communicated back to the UI.
- **Performance**: Thumbnails are generated on-demand and cached. Large PDFs are handled efficiently via streaming.

### Type Safety

The project uses TypeScript with strict mode. Key type definitions are in:
- `src/types/pdf.ts`: PDF-related types
- `src/types/worker.ts`: Web Worker message types
- Component props are properly typed inline

When adding new features, ensure proper TypeScript types are defined and avoid using `any`.

### Testing

**Test Framework**: Vitest with @testing-library/react for component testing.

**Test Organization**: Tests are organized into two main categories:
- `tests/unit/`: Unit tests for individual components and workers
- `tests/integration/`: Integration tests for complex workflows 
- `tests/fixtures/`: Test PDF documents used across all test suites

**Critical Unit Tests**: Core PDF processing functionality:
- `tests/unit/mupdf-worker.test.ts`: Tests the main PDF merge functionality
- `tests/unit/pdf-merge.test.ts`: Tests PDF link detection capabilities  
- `tests/unit/mupdf-links.test.ts`: Tests link preservation during merge operations
- `tests/unit/pdf-worker-integration.test.ts`: Tests worker communication

**Comprehensive Integration Tests**: End-to-end validation:
- `tests/integration/pdf-preservation.test.ts`: Complete test suite covering:
  - Form field preservation and interactivity
  - External link preservation (clickable URLs)
  - Page dimension and orientation preservation
  - Content integrity and text preservation
  - Error handling for problematic document combinations
  - Performance with large document merges

**PDF Processing Regression Tests**: Always run `yarn test` after making changes to:
- `src/workers/mupdf.worker.ts` (PDF merge logic)
- Any PDF processing functionality

**Test Files Location**: `tests/fixtures/` contains test PDF documents:
- `test_document.pdf`: Document with internal/external links
- `test_document3.pdf`: Additional document with links (causes page tree errors with merge())
- `form_document_fixed.pdf`: Document with 7 interactive form fields
- `diplom.pdf`: Multi-page portrait document
- `npwp.pdf`: Landscape orientation document

**Testing Methodology**: 
1. **Preservation Testing**: All tests verify that the hybrid merge approach preserves:
   - External URL links (verified clickable)
   - Interactive form fields (verified functional)
   - Original page dimensions (no unwanted rotation/resizing)
   - Text content integrity
   - Document structure and page counts

2. **Error Prevention**: Tests specifically check for:
   - "Cannot find page X in page tree" errors (prevented by avoiding internal links)
   - Page tree corruption (prevented by using graftPage instead of merge)
   - Form field loss (prevented by graftObject annotation copying)

3. **Edge Case Handling**: Tests cover problematic scenarios:
   - Documents with internal page links (test_document3.pdf)
   - Mixed orientation documents (landscape + portrait)
   - Large document merges
   - Empty document arrays
   - Single document merges

**Test Execution**: Run tests after every change to ensure no regressions:
```bash
yarn test                    # Run all tests
yarn test tests/unit         # Run only unit tests  
yarn test tests/integration  # Run only integration tests
yarn test:ui                 # Run tests with UI interface
```

**Important**: The comprehensive integration test suite in `pdf-preservation.test.ts` is designed to catch any regressions in the critical PDF preservation functionality. All tests should pass before committing changes.

**Analytics in Tests**: Amplitude tracking is automatically disabled during test runs to prevent test events from being recorded. The system detects test environments through multiple methods (NODE_ENV, jsdom user agent, vitest globals) and skips all tracking calls. This is verified by `tests/unit/amplitude.test.ts`.
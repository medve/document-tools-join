// Copyright © 2025 Anton Medvedev
// SPDX‑License‑Identifier: AGPL‑3.0‑or‑later

import { MUPDF_LOADED, type MupdfWorker } from "../workers/mupdf.worker";
import * as Comlink from "comlink";
import { Remote } from "comlink";
import { useEffect, useRef, useState } from "react";
import { trackError } from "@/lib/amplitude";

export function useMupdf() {
  const [isWorkerInitialized, setIsWorkerInitialized] = useState(false);
  const mupdfWorker = useRef<Remote<MupdfWorker>>();

  useEffect(() => {
    try {
      const worker = new Worker(
        new URL("../workers/mupdf.worker", import.meta.url),
        {
          type: "module",
        }
      );
      mupdfWorker.current = Comlink.wrap<MupdfWorker>(worker);

      worker.addEventListener("message", (event) => {
        if (event.data === MUPDF_LOADED) {
          setIsWorkerInitialized(true);
        }
      });

      worker.addEventListener("error", (event) => {
        trackError(new Error(event.message), {
          context: 'mupdf_worker',
          type: 'worker_error'
        });
      });

      return () => {
        worker.terminate();
      };
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'mupdf_worker_initialization'
      });
      throw error;
    }
  }, []);

  const mergeDocuments = async (documents: ArrayBuffer[]) => {
    try {
      return await mupdfWorker.current!.mergeDocuments(documents);
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'mupdf_merge_documents',
        documentCount: documents.length
      });
      throw error;
    }
  }

  const renderFirstPage = async (pdfBuffer: ArrayBuffer) => {
    try {
      return await mupdfWorker.current!.renderFirstPage(pdfBuffer);
    } catch (error) {
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'mupdf_render_first_page',
        bufferSize: pdfBuffer.byteLength
      });
      throw error;
    }
  }

  return {
    isWorkerInitialized,
    mergeDocuments,
    renderFirstPage,
  }
}



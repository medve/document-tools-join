// Copyright © 2025 Anton Medvedev
// SPDX‑License‑Identifier: AGPL‑3.0‑or‑later

import { MUPDF_LOADED, type MupdfWorker } from "../workers/mupdf.worker";
import * as Comlink from "comlink";
import { Remote } from "comlink";
import { useEffect, useRef, useState } from "react";

export function useMupdf() {
  const [isWorkerInitialized, setIsWorkerInitialized] = useState(false);
  const mupdfWorker = useRef<Remote<MupdfWorker>>();

  useEffect(() => {
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

    return () => {
      worker.terminate();
    };
  }, []);

  const mergeDocuments = async (documents: ArrayBuffer[]) => {
    return await mupdfWorker.current!.mergeDocuments(documents);
  }

  const renderFirstPage = async (pdfBuffer: ArrayBuffer) => {
    return await mupdfWorker.current!.renderFirstPage(pdfBuffer);
  }

  const rotateDocument = async (pdfBuffer: ArrayBuffer) => {
    return mupdfWorker.current!.rotateDocument(pdfBuffer);
  }

  return {
    isWorkerInitialized,
    mergeDocuments,
    renderFirstPage,
    rotateDocument,
  }
}



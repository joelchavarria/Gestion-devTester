"use client";

import { useEffect } from "react";

/** Registers a conservative worker: static assets are cached, never private operational data. */
export function PwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
}

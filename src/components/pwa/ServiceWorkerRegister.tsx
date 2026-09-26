"use client";

import { useEffect } from "react";

// Registers public/sw.js, which only serves the offline page when a page
// navigation fails. Renders nothing.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => console.error("Service worker registration failed", error));
  }, []);

  return null;
}

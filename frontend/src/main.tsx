import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import "./index.css";
import { router } from "./routes/router";

// ============================================================
// BROWSER SCROLL RESTORATION
// ============================================================

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

// ============================================================
// SERVICE WORKER
// ============================================================

const registerServiceWorker = async (): Promise<void> => {
  if (!("serviceWorker" in navigator)) {
    console.warn(
      "Service workers are not supported by this browser.",
    );

    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js");

    console.log(
      "PriceWatch service worker registered successfully.",
    );
  } catch (error) {
    console.error(
      "PriceWatch service worker registration failed:",
      error,
    );
  }
};

// Register service worker
void registerServiceWorker();

// ============================================================
// REACT APPLICATION
// ============================================================

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Root element was not found.",
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
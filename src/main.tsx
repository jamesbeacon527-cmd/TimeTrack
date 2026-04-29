import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Polyfill for currentElement.hasAttribute is not a function (fix for react-resizable-panels/select interactions)
if (typeof Node !== "undefined" && !Node.prototype.hasAttribute) {
  // @ts-expect-error - polyfill for non-elements
  Node.prototype.hasAttribute = function () { return false; };
}
if (typeof Window !== "undefined" && !Window.prototype.hasAttribute) {
  // @ts-expect-error - polyfill for window
  Window.prototype.hasAttribute = function () { return false; };
}

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")!).render(<App />);

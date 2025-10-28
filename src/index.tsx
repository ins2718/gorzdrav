import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";
import "./styles.css";


function getLpuFromUrl(): string | null {
    try {
        const hash = decodeURIComponent(window.location.hash.substring(1));
        if (!hash) return null;
        const params = JSON.parse(hash);
        const lpuParam = params.find((p: object) => "lpu" in p);
        return lpuParam ? lpuParam.lpu : null;
    } catch (e) {
        console.error("Gorzdrav helper: Error parsing URL hash", e);
        return null;
    }
}

let root: ReactDOM.Root | null = null;

function renderApp() {
    const rootElement = document.getElementById("gorzdrav-helper-root");
    if (!rootElement) {
        console.error("Gorzdrav helper: Root element not found!");
        return;
    }

    if (!root) {
        root = ReactDOM.createRoot(rootElement);
    }

    const lpuId = getLpuFromUrl();
    const shouldBeVisible = window.location.href.startsWith("https://gorzdrav.spb.ru/service-free-schedule") && lpuId;

    root.render(
        <React.StrictMode>
            {shouldBeVisible && lpuId ? <App lpuId={lpuId} /> : null}
        </React.StrictMode>
    );
}

export function initReactApp() {
    renderApp();
    window.addEventListener("hashchange", renderApp, false);
    new MutationObserver(renderApp).observe(document.body, { childList: true, subtree: true });
}
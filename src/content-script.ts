import { initReactApp } from "./index";

/**
 * Основная функция инициализации. Выполняется один раз.
 */
function initialize() {
    // Проверяем, что инициализация еще не была проведена
    if (document.getElementById("gorzdrav-helper-root")) {
        return;
    }

    const rootDiv = document.createElement("div");
    rootDiv.id = "gorzdrav-helper-root";
    document.body.appendChild(rootDiv);

    initReactApp();
}

// Запускаем инициализацию при загрузке страницы
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
} else {
    initialize();
}
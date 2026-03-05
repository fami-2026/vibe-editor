<script setup lang="ts">
import Toolbar from './gui/components/EditorToolbar.vue';
import PropertiesPanel from './gui/components/PropertiesPanel.vue';
import Canvas from './canvas/components/VectorCanvas.vue';
</script>

<template>
    <div class="app-layout">
        <header class="header">Vector Editor (MVP)</header>

        <aside class="left-panel">
            <Toolbar />
        </aside>

        <main class="viewport">
            <Canvas />
        </main>

        <aside class="right-panel">
            <PropertiesPanel />
        </aside>
    </div>
</template>

<style>
/* Глобальный сброс для body, чтобы приложение было на весь экран */
html,
body,
#app {
    margin: 0;
    padding: 0;
    height: 100%;
    width: 100%;
    overflow: hidden;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
</style>

<style scoped>
.app-layout {
    display: grid;
    height: 100vh;
    grid-template-areas:
        'header header header'
        'toolbar viewport properties';
    grid-template-rows: 40px 1fr; /* Шапка и остальное пространство */
    grid-template-columns: 80px 1fr 280px; /* Узкий тулбар, холст, широкая панель свойств */
}

.header {
    grid-area: header;
    background: #333;
    color: white;
    display: flex;
    align-items: center;
    padding: 0 1rem;
    font-size: 0.9rem;
    font-weight: bold;
}

.left-panel {
    grid-area: toolbar;
    border-right: 1px solid #ddd;
}

.viewport {
    grid-area: viewport;
    background: #e5e5e5; /* Серый фон за холстом */
    position: relative;
}

.right-panel {
    grid-area: properties;
    border-left: 1px solid #ddd;
}
</style>

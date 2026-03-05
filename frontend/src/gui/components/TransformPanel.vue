<template>
    <div class="transform-panel" v-if="selectedShape">
        <h3>Трансформация</h3>

        <!-- Поворот -->
        <div class="control-group">
            <label>Поворот (градусы)</label>
            <input
                v-model.number="selectedShape.rotation"
                type="range"
                min="0"
                max="360"
                step="1"
                class="slider"
            />
            <span class="value">{{ selectedShape.rotation.toFixed(0) }}°</span>
        </div>

        <!-- Масштабирование -->
        <div class="control-group">
            <label>Масштаб X</label>
            <input
                v-model.number="selectedShape.scaleX"
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                class="slider"
            />
            <span class="value">{{ selectedShape.scaleX.toFixed(2) }}</span>
        </div>

        <div class="control-group">
            <label>Масштаб Y</label>
            <input
                v-model.number="selectedShape.scaleY"
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                class="slider"
            />
            <span class="value">{{ selectedShape.scaleY.toFixed(2) }}</span>
        </div>

        <!-- Сдвиг (Skew) -->
        <div class="control-group">
            <label>Сдвиг X</label>
            <input
                v-model.number="selectedShape.skewX"
                type="range"
                min="-1"
                max="1"
                step="0.1"
                class="slider"
            />
            <span class="value">{{ selectedShape.skewX.toFixed(2) }}</span>
        </div>

        <div class="control-group">
            <label>Сдвиг Y</label>
            <input
                v-model.number="selectedShape.skewY"
                type="range"
                min="-1"
                max="1"
                step="0.1"
                class="slider"
            />
            <span class="value">{{ selectedShape.skewY.toFixed(2) }}</span>
        </div>

        <!-- Отражения -->
        <div class="button-group">
            <button
                @click="selectedShape.reflectX()"
                class="transform-button"
                :class="{ active: selectedShape.flipX }"
                title="Отразить по оси X"
            >
                ⟷ Отразить X
            </button>
            <button
                @click="selectedShape.reflectY()"
                class="transform-button"
                :class="{ active: selectedShape.flipY }"
                title="Отразить по оси Y"
            >
                ⟨⟩ Отразить Y
            </button>
        </div>

        <!-- Быстрые действия -->
        <div class="quick-actions">
            <button @click="resetTransforms" class="reset-button">Сбросить трансформацию</button>
            <button @click="rotateClockwise" class="action-button">Повернуть ↻ 90°</button>
            <button @click="rotateCounterClockwise" class="action-button">Повернуть ↺ 90°</button>
        </div>

        <!-- Матричная информация (для отладки) -->
        <details class="matrix-info">
            <summary>Матрица преобразования (для разработчиков)</summary>
            <pre>{{ matrixString }}</pre>
        </details>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BaseShape } from '@/canvas/types';
import { useCanvasStore } from '@/stores/canvas';

const canvasStore = useCanvasStore();

const selectedShape = computed(() => {
    if (!canvasStore.selectedId) return null;
    return canvasStore.shapes.find(s => s.id === canvasStore.selectedId) || null;
});

const matrixString = computed(() => {
    if (!selectedShape.value) return 'Нет выбранной фигуры';
    const matrix = selectedShape.value.getTransformMatrix();
    return matrix.toString();
});

function resetTransforms() {
    if (!selectedShape.value) return;
    selectedShape.value.rotation = 0;
    selectedShape.value.scaleX = 1;
    selectedShape.value.scaleY = 1;
    selectedShape.value.skewX = 0;
    selectedShape.value.skewY = 0;
    selectedShape.value.flipX = false;
    selectedShape.value.flipY = false;
}

function rotateClockwise() {
    if (!selectedShape.value) return;
    selectedShape.value.rotate(90);
}

function rotateCounterClockwise() {
    if (!selectedShape.value) return;
    selectedShape.value.rotate(-90);
}
</script>

<style scoped>
.transform-panel {
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 6px 8px;
    margin-top: 4px;
}

.transform-panel h3 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
}

.control-group {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
}

.control-group label {
    flex: 0 0 100px;
    font-size: 12px;
    font-weight: 500;
    color: #666;
}

.slider {
    flex: 1;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: #ddd;
    border-radius: 5px;
    outline: none;
    cursor: pointer;
}

.slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: #2196f3;
    border-radius: 50%;
    cursor: grab;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #2196f3;
    border-radius: 50%;
    cursor: grab;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.value {
    flex: 0 0 50px;
    text-align: right;
    font-size: 12px;
    font-weight: 500;
    color: #2196f3;
    font-family: 'Courier New', monospace;
}

.button-group {
    display: flex;
    gap: 8px;
    margin: 15px 0;
}

.transform-button {
    flex: 1;
    padding: 8px 12px;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
}

.transform-button:hover {
    border-color: #2196f3;
    color: #2196f3;
}

.transform-button.active {
    background-color: #2196f3;
    border-color: #2196f3;
    color: white;
}

.quick-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #ddd;
}

.action-button {
    padding: 8px 12px;
    background-color: #4caf50;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
}

.action-button:hover {
    background-color: #45a049;
}

.reset-button {
    padding: 8px 12px;
    background-color: #ff9800;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
}

.reset-button:hover {
    background-color: #fb8c00;
}

.matrix-info {
    margin-top: 15px;
    padding: 10px;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 11px;
}

.matrix-info summary {
    cursor: pointer;
    font-weight: 500;
    color: #666;
    user-select: none;
}

.matrix-info pre {
    margin: 8px 0 0 0;
    padding: 8px;
    background-color: #f9f9f9;
    border-radius: 3px;
    overflow-x: auto;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    color: #333;
}
</style>

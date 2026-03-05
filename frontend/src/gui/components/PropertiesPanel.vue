<script setup lang="ts">
import { computed } from 'vue';
import { useCanvasStore } from '@/stores/canvas';
import { storeToRefs } from 'pinia';
import { getEditableProperties } from '@/canvas/types/property';
import type { Shape } from '@/canvas/types';
import FieldComponent from './fields/FieldComponent.vue';
import TransformPanel from './TransformPanel.vue';

const canvasStore = useCanvasStore();
const { selectedShape } = storeToRefs(canvasStore);

const properties = computed(() => {
    return selectedShape.value
        ? getEditableProperties(selectedShape.value)
        : [];
});

function deleteSelected() {
    if (selectedShape.value) {
        canvasStore.deleteShape(selectedShape.value.id);
    }
}

function updateProperty(key: string, value: unknown) {
    if (!selectedShape.value) return;
    canvasStore.updateShape(selectedShape.value.id, {
        [key]: value,
    } as Partial<Shape>);
}
</script>

<template>
    <div class="properties-panel">
        <h3>Свойства</h3>

        <template v-if="selectedShape">
            <div class="property-group">
                <label>ID</label>
                <input
                    type="text"
                    :value="selectedShape.id"
                    readonly
                    class="readonly-input"
                />
            </div>

            <div
                v-for="prop in properties"
                :key="prop.key"
                class="property-group"
            >
                <label>{{ prop.label }}</label>
                <FieldComponent
                    :descriptor="prop"
                    :model-value="(selectedShape as any)[prop.key]"
                    @update:model-value="updateProperty(prop.key, $event)"
                />
            </div>

            <TransformPanel />


            <button class="delete-btn" @click="deleteSelected">Удалить</button>
        </template>

        <div v-else class="empty-state">Нет выделения</div>
    </div>
</template>

<style scoped>
.properties-panel {
    padding: 1rem;
    background: #f0f0f0;
    border-left: 1px solid #ccc;
    min-width: 250px;
    max-height: 100vh;
    overflow-y: auto;
}

h3 {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
}

.empty-state {
    color: #999;
    font-size: 0.9rem;
}

.property-group {
    margin-bottom: 0.2rem;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
}

label {
    font-size: 0.8rem;
    color: #666;
    font-weight: 500;
    margin: 0;
}

.readonly-input {
    padding: 0.3rem 0.4rem;
    border: 1px solid #ddd;
    border-radius: 3px;
    background: #e8e8e8;
    color: #666;
    font-size: 0.75rem;
    margin: 0;
}

/* Стили для всех input элементов в панели свойств */
:deep(input[type="number"]),
:deep(input[type="text"]),
:deep(input[type="color"]) {
    width: 100%;
    padding: 0.3rem 0.4rem;
    border: 1px solid #ddd;
    border-radius: 3px;
    background: white;
    color: #333;
    font-size: 0.75rem;
    margin: 0;
    box-sizing: border-box;
}

.delete-btn {
    width: 100%;
    padding: 0.6rem;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.9rem;
    margin-top: 1rem;
    transition: background 0.2s;
}

.delete-btn:hover {
    background: #d32f2f;
}
</style>

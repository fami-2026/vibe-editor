import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Shape } from '@/canvas/types';
import { shapeRegistry } from '@/canvas/types';
import { generateId } from '@/canvas/utils/math';

/**
 * Хранилище состояния сцены: фигуры, выделение, операции.
 */
export const useCanvasStore = defineStore('canvas', () => {
    // Инициализируем с тестовыми фигурами для проверки рендеринга
    const testShapes = [
        shapeRegistry.create('rect', generateId(), { x: 200, y: 200 }),
        shapeRegistry.create('circle', generateId(), { x: 450, y: 250 }),
        shapeRegistry.create('line', generateId(), { x: 100, y: 100 }),
    ];
    
    const shapes = ref<Shape[]>(testShapes);
    const selectedId = ref<string | null>(null);

    const selectedShape = computed(
        () => shapes.value.find((s) => s.id === selectedId.value) ?? null
    );

    function addShape(type: string, pos: { x: number; y: number }) {
        const shape = shapeRegistry.create(type, generateId(), pos);
        shapes.value.push(shape);
        return shape;
    }

    function updateShape(id: string, updates: Partial<Shape>) {
        const shape = shapes.value.find((s) => s.id === id);
        if (shape) {
            Object.assign(shape, updates);
            shapes.value = [...shapes.value];
        }
    }

    function deleteShape(id: string) {
        shapes.value = shapes.value.filter((s) => s.id !== id);
        if (selectedId.value === id) selectedId.value = null;
    }

    function selectShape(id: string | null) {
        selectedId.value = id;
    }

    return {
        shapes,
        selectedId,
        selectedShape,
        addShape,
        updateShape,
        deleteShape,
        selectShape,
    };
});

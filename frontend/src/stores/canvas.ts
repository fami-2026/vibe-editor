import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { Shape } from '@/canvas/types';
import { shapeRegistry } from '@/canvas/types';
import { generateId } from '@/canvas/utils/math';
import { PolygonShape } from '@/canvas/types/polygon/polygon';

interface ShapeParams extends Record<string, unknown> {
    sides?: number;
    width?: number;
    height?: number;
    radius?: number;
    fill?: string;
    fillOpacity?: number;
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
    rotation?: number;
}

type SerializedShapeBase = {
    type: string;
    id: string;
    position: { x: number; y: number };
    rotation: number;
    scaleX: number;
    scaleY: number;
};

type SerializedShape = SerializedShapeBase & Record<string, unknown>;

type SceneSnapshot = {
    shapes: SerializedShape[];
    selectedId: string | null;
};

export const useCanvasStore = defineStore('canvas', () => {
    const shapes = ref<Shape[]>([]);
    const selectedId = ref<string | null>(null);

    const undoStack = ref<SceneSnapshot[]>([]);
    const redoStack = ref<SceneSnapshot[]>([]);
    const isInteractionActive = ref(false);
    const HISTORY_LIMIT = 50;
    const MIN_ZOOM = 10;
    const MAX_ZOOM = 500;
    const ZOOM_STEP = 10;
    const zoom = ref(100);

    let isContinuousChangeActive = false;
    let continuousChangeTimer: number | null = null;
    const CONTINUOUS_CHANGE_TIMEOUT = 700;

    const selectedShape = computed(
        () => shapes.value.find((s) => s.id === selectedId.value) ?? null
    );

    function serializeShape(shape: Shape): SerializedShape {
        const plain = JSON.parse(JSON.stringify(shape)) as SerializedShape;
        plain.type = (shape as unknown as { type: string }).type;
        plain.id = shape.id;
        plain.position = { x: shape.position.x, y: shape.position.y };
        plain.rotation = shape.rotation;
        plain.scaleX = shape.scaleX;
        plain.scaleY = shape.scaleY;
        return plain;
    }

    function createSnapshot(): SceneSnapshot {
        return {
            shapes: shapes.value.map((s) => serializeShape(s)),
            selectedId: selectedId.value,
        };
    }

    function restoreSnapshot(snapshot: SceneSnapshot) {
        const restored: Shape[] = snapshot.shapes.map((plain) => {
            const { type, id, position, ...rest } = plain;
            const shape = shapeRegistry.create(type, id, position);
            Object.assign(shape, rest);
            return shape as Shape;
        });

        shapes.value = restored;
        selectedId.value = snapshot.selectedId;
    }

    function pushHistory() {
        const snapshot = createSnapshot();
        undoStack.value.push(snapshot);
        if (undoStack.value.length > HISTORY_LIMIT) {
            undoStack.value.shift();
        }
        redoStack.value = [];
    }

    function startInteraction() {
        if (!isInteractionActive.value) {
            pushHistory();
            isInteractionActive.value = true;
        }
    }

    function endInteraction() {
        isInteractionActive.value = false;
    }

    function ensureHistoryForContinuousChange() {
        if (isInteractionActive.value) return;

        if (!isContinuousChangeActive) {
            pushHistory();
            isContinuousChangeActive = true;
        }

        if (continuousChangeTimer !== null) {
            window.clearTimeout(continuousChangeTimer);
        }

        continuousChangeTimer = window.setTimeout(() => {
            isContinuousChangeActive = false;
            continuousChangeTimer = null;
        }, CONTINUOUS_CHANGE_TIMEOUT);
    }

    function undo() {
        const snapshot = undoStack.value.pop();
        if (!snapshot) return;

        const current = createSnapshot();
        redoStack.value.push(current);
        restoreSnapshot(snapshot);
    }

    function redo() {
        const snapshot = redoStack.value.pop();
        if (!snapshot) return;

        const current = createSnapshot();
        undoStack.value.push(current);
        restoreSnapshot(snapshot);
    }

    const canUndo = computed(() => undoStack.value.length > 0);
    const canRedo = computed(() => redoStack.value.length > 0);

    function addShape(
        type: string,
        pos: { x: number; y: number },
        params?: ShapeParams
    ) {
        pushHistory();

        const existingShapesOfType = shapes.value.filter(
            (s) => s.type === type
        );
        const typeName =
            type === 'rect'
                ? 'Прямоугольник'
                : type === 'circle'
                  ? 'Круг'
                  : type === 'line'
                    ? 'Линия'
                    : type === 'polygon'
                      ? 'Многоугольник'
                      : type === 'star'
                        ? 'Звезда'
                        : type === 'triangle'
                          ? 'Треугольник'
                          : type === 'arrow'
                            ? 'Стрелка'
                            : type === 'hexagon'
                              ? 'Шестиугольник'
                              : type;

        const number = existingShapesOfType.length + 1;
        const defaultName = `${typeName} ${number}`;

        let shape: Shape;

        if (type === 'polygon' && params?.sides) {
            shape = new PolygonShape(
                generateId(),
                pos,
                params.sides,
                100,
                100,
                0,
                'transparent',
                1,
                '#000000',
                1,
                2
            );
            (shape as Shape).name = defaultName;
            shapes.value.push(shape);
            return shape;
        }

        shape = shapeRegistry.create(type, generateId(), pos);
        (shape as Shape).name = defaultName;
        shapes.value.push(shape);
        return shape;
    }

    function updateShape(id: string, updates: Partial<Shape>) {
        ensureHistoryForContinuousChange();
        const shape = shapes.value.find((s) => s.id === id);
        if (shape) {
            Object.assign(shape, updates);
            shapes.value = [...shapes.value];
        }
    }

    function deleteShape(id: string) {
        pushHistory();
        shapes.value = shapes.value.filter((s) => s.id !== id);
        if (selectedId.value === id) selectedId.value = null;
    }

    function moveShape(fromIndex: number, toIndex: number) {
        if (
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >= shapes.value.length ||
            toIndex >= shapes.value.length
        ) {
            return;
        }

        pushHistory();
        const next = [...shapes.value];
        const [item] = next.splice(fromIndex, 1);
        if (!item) {
            return;
        }
        next.splice(toIndex, 0, item);
        shapes.value = next;
    }

    function selectShape(id: string | null) {
        selectedId.value = id;
    }

    function setZoom(value: number) {
        zoom.value = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, Math.round(value))
        );
    }

    function zoomIn() {
        setZoom(zoom.value + ZOOM_STEP);
    }

    function zoomOut() {
        setZoom(zoom.value - ZOOM_STEP);
    }

    const STORAGE_KEY = 'vector-editor-canvas';

    function saveToLocalStorage() {
        try {
            const data = {
                shapes: shapes.value.map(serializeShape),
                selectedId: selectedId.value,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Ошибка сохранения:', e);
        }
    }

    function loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) return;

            const data = JSON.parse(saved) as {
                shapes: SerializedShape[];
                selectedId: string | null;
            };

            const restored: Shape[] = data.shapes.map(
                (plain: SerializedShape) => {
                    const { type, id, position, ...rest } = plain;
                    const shape = shapeRegistry.create(type, id, position);
                    Object.assign(shape, rest);
                    return shape as Shape;
                }
            );

            shapes.value = restored;
            selectedId.value = data.selectedId || null;
        } catch (e) {
            console.error('Ошибка загрузки:', e);
        }
    }

    loadFromLocalStorage();

    watch(
        [shapes, selectedId],
        () => {
            saveToLocalStorage();
        },
        { deep: true }
    );

    return {
        shapes,
        selectedId,
        selectedShape,
        addShape,
        updateShape,
        deleteShape,
        selectShape,
        moveShape,
        undo,
        redo,
        canUndo,
        canRedo,
        zoom,
        setZoom,
        zoomIn,
        zoomOut,
        startInteraction,
        endInteraction,
    };
});

import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { Shape, Point } from '@/canvas/types';
import { shapeRegistry } from '@/canvas/types';
import { generateId } from '@/canvas/utils/math';
import { PolygonShape } from '@/canvas/types/polygon/polygon';
import { CurveShapeWrapper } from '@/canvas/types/curve/curve';

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

interface CurveDrawingState {
    points: Point[];
}

type SerializedShapeBase = {
    type: string;
    id: string;
    position: { x: number; y: number };
    rotation: number;
    scaleX: number;
    scaleY: number;
};

type SerializedShape = SerializedShapeBase & Record<string, unknown> & {
    points?: Point[];
};

type SceneSnapshot = {
    shapes: SerializedShape[];
    selectedId: string | null;
};

// Тип для данных в localStorage
type StorageData = {
    shapes: SerializedShape[];
    selectedId: string | null;
    zoom: number; // Добавляем zoom
};

export const useCanvasStore = defineStore('canvas', () => {
    const shapes = ref<Shape[]>([]);
    const selectedId = ref<string | null>(null);

    const curveDrawing = ref<CurveDrawingState | null>(null);
    const editingCurve = ref<CurveShapeWrapper | null>(null);
    const isEditingMode = ref(false);

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
        
        // Сохраняем точки для кривой
        if (shape.type === 'curve') {
            const curve = shape as CurveShapeWrapper;
            plain.points = curve.getGlobalPoints();
        }
        
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
            const { type, id, position, points, ...rest } = plain;
            const shape = shapeRegistry.create(type, id, position);
            
            // Специальная обработка для кривой
            if (type === 'curve' && points) {
                const curve = shape as CurveShapeWrapper;
                curve.setGlobalPoints(points);
            }
            
            Object.assign(shape, rest);
            return shape as Shape;
        });

        shapes.value = restored;
        selectedId.value = snapshot.selectedId;
        
        // Если мы в режиме редактирования, обновляем ссылку на кривую
        if (isEditingMode.value && selectedId.value) {
            const curve = shapes.value.find(s => s.id === selectedId.value);
            if (curve && curve.type === 'curve') {
                editingCurve.value = curve as CurveShapeWrapper;
            }
        }
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
                              : type === 'curve'
                                ? 'Кривая'
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
        zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(value)));
    }

    function zoomIn() {
        setZoom(zoom.value + ZOOM_STEP);
    }

    function zoomOut() {
        setZoom(zoom.value - ZOOM_STEP);
    }

    // ===== МЕТОДЫ ДЛЯ КРИВОЙ =====
    function startCurveDrawing() {
        curveDrawing.value = { points: [] };
    }

    function handleCanvasClick(x: number, y: number) {
        if (!curveDrawing.value) return;
        curveDrawing.value.points.push({ x, y });
        if (curveDrawing.value.points.length === 2) {
            createStraightCurve();
        }
    }

    function createStraightCurve() {
        if (!curveDrawing.value || curveDrawing.value.points.length !== 2)
            return;

        const points = curveDrawing.value.points;
        const start = points[0];
        const end = points[1];

        if (start && end) {
            const existingCurves = shapes.value.filter(
                (s) => s.type === 'curve'
            );
            const defaultName = `Кривая ${existingCurves.length + 1}`;

            const curve = new CurveShapeWrapper(generateId(), start);

            const globalPoints = [
                start,
                {
                    x: (start.x + end.x) / 2,
                    y: (start.y + end.y) / 2,
                },
                end,
            ];
            curve.setGlobalPoints(globalPoints);
            (curve as Shape).name = defaultName;

            shapes.value.push(curve);
            curveDrawing.value = null;
        }
    }

    function editCurve(shape: CurveShapeWrapper) {
        editingCurve.value = shape;
        isEditingMode.value = true;
        selectedId.value = shape.id;
    }

    function exitEditMode() {
        editingCurve.value = null;
        isEditingMode.value = false;
        selectedId.value = null;
    }

    function pushHistoryForCurve() {
        // Создаем снапшот текущего состояния
        const snapshot = createSnapshot();
        
        // Добавляем в историю
        undoStack.value.push(snapshot);
        if (undoStack.value.length > HISTORY_LIMIT) {
            undoStack.value.shift();
        }
        
        // Очищаем redo стек
        redoStack.value = [];
        
        // Сохраняем ссылку на редактируемую кривую
        if (editingCurve.value) {
            selectedId.value = editingCurve.value.id;
        }
    }

    function cancelCurveDrawing() {
        curveDrawing.value = null;
    }

    const STORAGE_KEY = 'vector-editor-canvas';

    function saveToLocalStorage() {
        try {
            const data: StorageData = {
                shapes: shapes.value.map(serializeShape),
                selectedId: selectedId.value,
                zoom: zoom.value, // Сохраняем zoom
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

            const data = JSON.parse(saved) as StorageData;

            const restored: Shape[] = data.shapes.map((plain: SerializedShape) => {
                const { type, id, position, points, ...rest } = plain;
                const shape = shapeRegistry.create(type, id, position);
                
                // Специальная обработка для кривой
                if (type === 'curve' && points) {
                    const curve = shape as CurveShapeWrapper;
                    curve.setGlobalPoints(points);
                }
                
                Object.assign(shape, rest);
                return shape as Shape;
            });

            shapes.value = restored;
            selectedId.value = data.selectedId || null;
            
            // Восстанавливаем zoom
            if (data.zoom !== undefined) {
                zoom.value = data.zoom;
            }
        } catch (e) {
            console.error('Ошибка загрузки:', e);
        }
    }

    loadFromLocalStorage();

    watch(
        [shapes, selectedId, zoom], // Добавляем zoom в watch
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
        curveDrawing,
        editingCurve,
        isEditingMode,
        startCurveDrawing,
        handleCanvasClick,
        createStraightCurve,
        editCurve,
        exitEditMode,
        pushHistoryForCurve,
        cancelCurveDrawing,
    };
});
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { shapeRegistry } from '@/canvas/types';
import { generateId } from '@/canvas/utils/math';
import { PolygonShape } from '@/canvas/types/polygon/polygon';
import type { Shape, Point } from '@/canvas/types';
import { CurveShapeWrapper } from '@/canvas/types/curve/curve';

interface ShapeParams extends Record<string, unknown> {
    sides?: number;
}

interface CurveDrawingState {
    points: Point[];
}

export interface EditableCurve {
    id?: string;
    points: Point[];
    stroke: string;
    strokeOpacity: number;
    strokeWidth: number;
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
type SceneSnapshot = { shapes: SerializedShape[]; selectedId: string | null };

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

    let isContinuousChangeActive = false;
    let continuousChangeTimer: number | null = null;
    const CONTINUOUS_CHANGE_TIMEOUT = 700;

    const selectedShape = computed(() => shapes.value.find((s) => s.id === selectedId.value) ?? null);

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
        return { shapes: shapes.value.map((s) => serializeShape(s)), selectedId: selectedId.value };
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
        if (undoStack.value.length > HISTORY_LIMIT) undoStack.value.shift();
        redoStack.value = [];
    }

    function startInteraction() {
        if (!isInteractionActive.value) {
            pushHistory();
            isInteractionActive.value = true;
        }
    }

    function endInteraction() { isInteractionActive.value = false; }

    function ensureHistoryForContinuousChange() {
        if (isInteractionActive.value) return;
        if (!isContinuousChangeActive) {
            pushHistory();
            isContinuousChangeActive = true;
        }
        if (continuousChangeTimer !== null) window.clearTimeout(continuousChangeTimer);
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

    function addShape(type: string, pos: { x: number; y: number }, params?: ShapeParams) {
        pushHistory();

        // Генерация уникального имени
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
            const shape = new PolygonShape(
                generateId(), pos, params.sides, 100, 100, 0,
                'transparent', 1, '#000000', 1, 2
            );
            (shape as Shape).name = defaultName;
                generateId(), pos, params.sides, 100, 100, 0,
                'transparent', 1, '#000000', 1, 2
            );
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
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= shapes.value.length || toIndex >= shapes.value.length) return;
        pushHistory();
        const next = [...shapes.value];
        const [item] = next.splice(fromIndex, 1);
        if (!item) return;
        next.splice(toIndex, 0, item);
        shapes.value = next;
    }

    function selectShape(id: string | null) { selectedId.value = id; }

    function startCurveDrawing() { curveDrawing.value = { points: [] }; }

    function handleCanvasClick(x: number, y: number) {
        if (!curveDrawing.value) return;
        curveDrawing.value.points.push({ x, y });
        if (curveDrawing.value.points.length === 2) createStraightCurve();
    }

    function createStraightCurve() {
        if (!curveDrawing.value || curveDrawing.value.points.length !== 2) return;
        const points = curveDrawing.value.points;
        const start = points[0];
        const end = points[1];
        
        if (start && end) {
            const curve = new CurveShapeWrapper(generateId(), start);
            curve.setGlobalPoints([start, { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }, end]);
            shapes.value.push(curve);
            curveDrawing.value = null;
        }
    }

    function updateCurve(updatedCurve: EditableCurve) {
        if (!updatedCurve.id) return;
        const index = shapes.value.findIndex(s => s.id === updatedCurve.id);
        if (index !== -1) {
            const shape = shapes.value[index] as unknown as CurveShapeWrapper;
            shape.setGlobalPoints(updatedCurve.points);
            shapes.value = [...shapes.value];
        }
    }

    function editCurve(shape: CurveShapeWrapper) {
        const points = shape.getGlobalPoints();
        if (points.length === 2) {
            points.splice(1, 0, { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
            shape.setGlobalPoints(points);
        }
        editingCurve.value = shape;
        isEditingMode.value = true;
        selectedId.value = shape.id;
    }

    function exitEditMode() {
        editingCurve.value = null;
        isEditingMode.value = false;
        selectedId.value = null;
    }

    function pushHistoryForCurve() { if (editingCurve.value) pushHistory(); }

    function cancelCurveDrawing() { curveDrawing.value = null; }

    return {
        shapes, selectedId, selectedShape, addShape, updateShape, deleteShape, selectShape, moveShape,
        undo, redo, canUndo, canRedo, startInteraction, endInteraction,
        curveDrawing, startCurveDrawing, handleCanvasClick, cancelCurveDrawing,
        editCurve, updateCurve, editingCurve, isEditingMode, exitEditMode, pushHistoryForCurve,
    };
});

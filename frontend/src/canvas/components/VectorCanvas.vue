<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useCanvasStore } from '@/stores/canvas';
import { useCanvasRender } from '@/canvas/composables/useCanvasRender';
import { useInteractions } from '@/canvas/composables/useInteractions';
import type { CurveShapeWrapper } from '@/canvas/types/curve/curve';
import type { CurveShape } from '@/canvas/types/curve/curve';
import type { Point } from '@/canvas/types';

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const canvasStore = useCanvasStore();
const { shapes, selectedId, curveDrawing, editingCurve, isEditingMode, zoom } =
    storeToRefs(canvasStore);

const { draw } = useCanvasRender(canvasRef, shapes, selectedId, zoom);
const { attachListeners } = useInteractions(canvasRef, shapes, zoom);

let resizeObserver: ResizeObserver | null = null;
let detachListeners: (() => void) | undefined;

const draggedPointIndex = ref<number | null>(null);
const isDragging = ref(false);
const lastMousePos = ref<{ x: number; y: number } | null>(null);
const initialPoints = ref<Point[]>([]);
const isEditInteraction = ref(false);
const selectedPointIndex = ref<number | null>(null);

// Границы холста в мировых координатах (с учетом зума)
const canvasBounds = ref({ minX: 0, minY: 0, maxX: 0, maxY: 0 });

// Функция для преобразования экранных координат в координаты холста с учетом зума
function getCanvasPoint(e: MouseEvent): Point {
    if (!canvasRef.value) return { x: 0, y: 0 };

    const rect = canvasRef.value.getBoundingClientRect();
    const zoomFactor = zoom.value / 100;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    return {
        x: centerX + (screenX - centerX) / zoomFactor,
        y: centerY + (screenY - centerY) / zoomFactor,
    };
}

function updateCanvasBounds() {
    if (!canvasRef.value) return;

    // Границы в пикселях холста
    const width = canvasRef.value.width;
    const height = canvasRef.value.height;

    // Преобразуем в мировые координаты (инвертируем zoom трансформацию)
    const zoomFactor = zoom.value / 100;
    const centerX = width / 2;
    const centerY = height / 2;

    canvasBounds.value = {
        minX: centerX + (0 - centerX) / zoomFactor,
        minY: centerY + (0 - centerY) / zoomFactor,
        maxX: centerX + (width - centerX) / zoomFactor,
        maxY: centerY + (height - centerY) / zoomFactor,
    };
}

// Функция ограничения координат границами холста с учетом зума
function clampToBounds(point: Point): Point {
    return {
        x: Math.max(
            canvasBounds.value.minX,
            Math.min(canvasBounds.value.maxX, point.x)
        ),
        y: Math.max(
            canvasBounds.value.minY,
            Math.min(canvasBounds.value.maxY, point.y)
        ),
    };
}

type CurveHandleKind = 'active' | 'passive';

interface CurveHandleInfo {
    kind: CurveHandleKind;
    index: number;
    segmentIndex?: number;
    point: Point;
}

const selectedCurve = computed<CurveShape | null>(() => {
    const shape = shapes.value.find((s) => s.id === selectedId.value) || null;
    if (!shape || shape.type !== 'curve') return null;
    return shape as CurveShape;
});

function getSplinePoints(points: Point[]): Point[] {
    if (points.length < 2) return points;
    const result: Point[] = [];

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1] : points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];

        if (!p0 || !p1 || !p2 || !p3) continue;

        for (let s = 0; s <= 20; s++) {
            const t = s / 20;

            const x =
                0.5 *
                (2 * p1!.x +
                    (-p0!.x + p2!.x) * t +
                    (2 * p0!.x - 5 * p1!.x + 4 * p2!.x - p3!.x) * t * t +
                    (-p0!.x + 3 * p1!.x - 3 * p2!.x + p3!.x) * t * t * t);

            const y =
                0.5 *
                (2 * p1!.y +
                    (-p0!.y + p2!.y) * t +
                    (2 * p0!.y - 5 * p1!.y + 4 * p2!.y - p3!.y) * t * t +
                    (-p0!.y + 3 * p1!.y - 3 * p2!.y + p3!.y) * t * t * t);

            result.push({ x, y });
        }
    }
    return result;
}

function getEditingCurvePoints(): Point[] {
    if (!editingCurve.value) return [];
    return editingCurve.value
        .getGlobalPoints()
        .filter((p): p is Point => p !== undefined && p !== null);
}

function getCurveHandlesForEditing(): {
    active: Point[];
    passive: { point: Point; segmentIndex: number }[];
} {
    const points = getEditingCurvePoints();
    const passive: { point: Point; segmentIndex: number }[] = [];

    if (editingCurve.value) {
        for (let i = 0; i < points.length - 1; i++) {
            const mid = editingCurve.value.getPointOnCurveAtSegment(i, 0.5);
            passive.push({ point: mid, segmentIndex: i });
        }
    }

    return { active: points, passive };
}

function findClosestHandle(x: number, y: number): CurveHandleInfo | null {
    if (!editingCurve.value) return null;
    const { active, passive } = getCurveHandlesForEditing();

    // Динамический threshold в зависимости от зума
    const baseThreshold = 15;
    const threshold = baseThreshold / (zoom.value / 100);
    let minDist = Infinity;
    let closest: CurveHandleInfo | null = null;

    // Проверяем активные точки (основные)
    active.forEach((point, index) => {
        if (!point) return;
        const dist = Math.hypot(point.x - x, point.y - y);
        if (dist < minDist && dist < threshold) {
            minDist = dist;
            closest = { kind: 'active', index, point };
        }
    });

    // Проверяем пассивные точки (середины сегментов)
    passive.forEach(({ point, segmentIndex }, index) => {
        if (!point) return;
        const dist = Math.hypot(point.x - x, point.y - y);
        if (dist < minDist && dist < threshold) {
            minDist = dist;
            closest = {
                kind: 'passive',
                index,
                segmentIndex,
                point,
            };
        }
    });

    return closest;
}

const drawTemporaryPoints = () => {
    if (!canvasRef.value) return;
    const ctx = canvasRef.value.getContext('2d');
    if (!ctx) return;

    ctx.save();

    // Применяем zoom трансформацию
    const zoomFactor = zoom.value / 100;
    ctx.translate(canvasRef.value.width / 2, canvasRef.value.height / 2);
    ctx.scale(zoomFactor, zoomFactor);
    ctx.translate(-canvasRef.value.width / 2, -canvasRef.value.height / 2);

    if (curveDrawing.value) {
        const points = curveDrawing.value.points;
        points.forEach((point, index) => {
            if (!point) return;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = index === 0 ? '#4CAF50' : '#F44336';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }

    if (isEditingMode.value && editingCurve.value) {
        const points = getEditingCurvePoints();

        if (points.length > 0) {
            const splinePoints = getSplinePoints(points);
            if (splinePoints.length > 1) {
                ctx.beginPath();
                const firstPoint = splinePoints[0];
                if (firstPoint) {
                    ctx.moveTo(firstPoint.x, firstPoint.y);
                    for (let i = 1; i < splinePoints.length; i++) {
                        const point = splinePoints[i];
                        if (point) {
                            ctx.lineTo(point.x, point.y);
                        }
                    }
                    ctx.strokeStyle = editingCurve.value.stroke;
                    ctx.globalAlpha = editingCurve.value.strokeOpacity ?? 1;
                    ctx.lineWidth = editingCurve.value.strokeWidth ?? 2;
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }
        }

        const { passive } = getCurveHandlesForEditing();

        passive.forEach(({ point }) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(37, 99, 235, 0.2)';
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();
        });

        points.forEach((point, index) => {
            if (!point) return;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#2563eb';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();

            if (
                isDragging.value &&
                draggedPointIndex.value !== null &&
                draggedPointIndex.value === index
            ) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 12, 0, 2 * Math.PI);
                ctx.strokeStyle = '#1d4ed8';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (
                !isDragging.value &&
                selectedPointIndex.value !== null &&
                selectedPointIndex.value === index
            ) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 11, 0, 2 * Math.PI);
                ctx.strokeStyle = '#1d4ed8';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
    } else if (!isEditingMode.value && selectedCurve.value) {
        const curve = selectedCurve.value;
        const points = curve
            .getGlobalPoints()
            .filter((p): p is Point => p !== undefined && p !== null);

        points.forEach((point) => {
            if (!point) return;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = '#2563eb';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }

    // Текст рисуем без трансформации зума (в экранных координатах)
    ctx.restore();
    ctx.save();

    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (curveDrawing.value) {
        const text =
            curveDrawing.value.points.length === 1
                ? 'Кликните для конечной точки'
                : 'Рисование кривой';
        ctx.fillText(text, canvasRef.value.width / 2, 20);
    } else if (isEditingMode.value) {
        ctx.fillText(
            'Режим редактирования: перетаскивайте точки, Enter для выхода',
            canvasRef.value.width / 2,
            20
        );
    }

    ctx.restore();
};

const updateCanvasSize = () => {
    if (!containerRef.value || !canvasRef.value) return;
    const { clientWidth, clientHeight } = containerRef.value;
    if (
        canvasRef.value.width !== clientWidth ||
        canvasRef.value.height !== clientHeight
    ) {
        canvasRef.value.width = clientWidth;
        canvasRef.value.height = clientHeight;
        updateCanvasBounds();
        draw();
        drawTemporaryPoints();
    }
};

const customDraw = () => {
    draw();
    drawTemporaryPoints();
};

// Обработчик клика для рисования кривой
const handleCanvasClick = (e: MouseEvent) => {
    if (!canvasRef.value) return;
    const point = getCanvasPoint(e);

    if (canvasStore.curveDrawing) {
        canvasStore.handleCanvasClick(point.x, point.y);
        e.stopPropagation();
        customDraw();
    }
};

// Обработчик двойного клика для входа в режим редактирования
const handleCanvasDoubleClick = (e: MouseEvent) => {
    if (!canvasRef.value || isEditingMode.value) return;
    const point = getCanvasPoint(e);

    for (const shape of canvasStore.shapes) {
        if (shape?.type === 'curve' && shape.hitTest(point)) {
            canvasStore.editCurve(shape as CurveShapeWrapper);
            e.stopPropagation();
            break;
        }
    }
};

// Обработчик нажатия мыши
const handleCanvasMouseDown = (e: MouseEvent) => {
    if (!canvasRef.value) return;

    const point = getCanvasPoint(e);

    // Режим редактирования кривой
    if (isEditingMode.value && editingCurve.value) {
        const handle = findClosestHandle(point.x, point.y);
        if (handle) {
            e.preventDefault();
            e.stopPropagation();
            (e as MouseEvent).stopImmediatePropagation?.();
            isEditInteraction.value = true;
            lastMousePos.value = { x: point.x, y: point.y };

            if (
                handle.kind === 'passive' &&
                handle.segmentIndex !== undefined
            ) {
                // Добавляем новую точку в середине сегмента
                const insertIndex = handle.segmentIndex + 1;
                editingCurve.value.addPoint(insertIndex, handle.point);
                const globalPoints = getEditingCurvePoints();
                initialPoints.value = globalPoints.map((p) => ({ ...p }));
                draggedPointIndex.value = insertIndex;
                selectedPointIndex.value = insertIndex;
            } else {
                // Перетаскиваем существующую точку
                const globalPoints = getEditingCurvePoints();
                initialPoints.value = globalPoints.map((p) => ({ ...p }));
                draggedPointIndex.value = handle.index;
                selectedPointIndex.value = handle.index;
            }

            isDragging.value = true;
        } else {
            selectedPointIndex.value = null;
        }
        return;
    }

    // Режим выделения (не редактирование)
    if (!isEditingMode.value && selectedCurve.value) {
        const curve = selectedCurve.value;
        const points = curve
            .getGlobalPoints()
            .filter((p): p is Point => p !== undefined && p !== null);

        const baseThreshold = 15;
        const threshold = baseThreshold / (zoom.value / 100);
        let minDist = Infinity;
        let closestIndex: number | null = null;

        points.forEach((p, index) => {
            const dist = Math.hypot(p.x - point.x, p.y - point.y);
            if (dist < minDist && dist < threshold) {
                minDist = dist;
                closestIndex = index;
            }
        });

        if (closestIndex !== null) {
            e.preventDefault();
            e.stopPropagation();
            (e as MouseEvent).stopImmediatePropagation?.();
            isEditInteraction.value = true;
            lastMousePos.value = { x: point.x, y: point.y };
            initialPoints.value = points.map((p) => ({ ...p }));
            draggedPointIndex.value = closestIndex;
            isDragging.value = true;
        }
        // Если не попали в точку, ничего не делаем - пусть базовый обработчик обрабатывает
    }
};

// ИСПРАВЛЕННЫЙ обработчик движения мыши с clampToBounds
const handleCanvasMouseMove = (e: MouseEvent) => {
    if (
        !isDragging.value ||
        draggedPointIndex.value === null ||
        !lastMousePos.value
    )
        return;

    e.preventDefault();
    e.stopPropagation();

    const point = getCanvasPoint(e);

    const deltaX = point.x - lastMousePos.value.x;
    const deltaY = point.y - lastMousePos.value.y;
    const pointIndex = draggedPointIndex.value;

    if (pointIndex >= 0) {
        // Получаем текущие точки кривой
        let currentPoints: Point[];

        if (isEditingMode.value && editingCurve.value) {
            currentPoints = editingCurve.value.getGlobalPoints();
        } else if (!isEditingMode.value && selectedCurve.value) {
            currentPoints = selectedCurve.value.getGlobalPoints();
        } else {
            return;
        }

        // Проверяем, что индекс существует
        if (pointIndex >= currentPoints.length) {
            return;
        }

        // Применяем дельту только к перемещаемой точке и ограничиваем координаты
        const newPoints = currentPoints.map((p, idx) => {
            if (!p) return { x: 0, y: 0 };
            if (idx === pointIndex) {
                // Ограничиваем координаты границами холста
                return clampToBounds({ x: p.x + deltaX, y: p.y + deltaY });
            }
            return { ...p };
        });

        if (isEditingMode.value && editingCurve.value) {
            editingCurve.value.setGlobalPoints(newPoints);
        } else if (!isEditingMode.value && selectedCurve.value) {
            selectedCurve.value.setGlobalPoints(newPoints);
        }

        // Обновляем lastMousePos для следующего шага
        lastMousePos.value = { x: point.x, y: point.y };
    }
    customDraw();
};

// Обработчик отпускания мыши
const handleCanvasMouseUp = (e: MouseEvent) => {
    if (isDragging.value && draggedPointIndex.value !== null) {
        e.preventDefault();
        e.stopPropagation();

        if (isEditingMode.value && editingCurve.value) {
            canvasStore.pushHistoryForCurve();
            selectedPointIndex.value = draggedPointIndex.value;
        }
    }

    isDragging.value = false;
    draggedPointIndex.value = null;
    lastMousePos.value = null;
    initialPoints.value = [];

    setTimeout(() => {
        isEditInteraction.value = false;
    }, 100);
    customDraw();
};

// Обработчик клавиш
const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isEditingMode.value) {
        isEditInteraction.value = false;
        canvasStore.exitEditMode();
        customDraw();
    }
    if (e.key === 'Enter' && isEditingMode.value) {
        isEditInteraction.value = false;
        canvasStore.exitEditMode();
        customDraw();
    }
    if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        isEditingMode.value &&
        editingCurve.value &&
        selectedPointIndex.value !== null
    ) {
        e.preventDefault();
        const index = selectedPointIndex.value;
        editingCurve.value.removePoint(index);
        canvasStore.pushHistoryForCurve();

        const points = getEditingCurvePoints();
        if (points.length <= 2) {
            selectedPointIndex.value = null;
        } else if (index >= points.length) {
            selectedPointIndex.value = points.length - 1;
        }
        customDraw();
    }
};

// Кастомное подключение слушателей
const customAttachListeners = () => {
    if (!canvasRef.value) return () => {};
    const canvas = canvasRef.value;

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('dblclick', handleCanvasDoubleClick);
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mouseup', handleCanvasMouseUp);
    canvas.addEventListener('mouseleave', handleCanvasMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    const originalAttach = attachListeners();

    const originalMouseMove = canvas.onmousemove;
    const originalMouseUp = canvas.onmouseup;
    const originalMouseDown = canvas.onmousedown;

    canvas.onmousedown = (e) => {
        if (isEditInteraction.value || isEditingMode.value) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        if (originalMouseDown) return originalMouseDown.call(canvas, e);
    };

    canvas.onmousemove = (e) => {
        if (isEditInteraction.value || isEditingMode.value) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        if (originalMouseMove) return originalMouseMove.call(canvas, e);
    };

    canvas.onmouseup = (e) => {
        if (isEditInteraction.value || isEditingMode.value) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
        if (originalMouseUp) return originalMouseUp.call(canvas, e);
    };

    return () => {
        canvas.removeEventListener('click', handleCanvasClick);
        canvas.removeEventListener('dblclick', handleCanvasDoubleClick);
        canvas.removeEventListener('mousedown', handleCanvasMouseDown);
        canvas.removeEventListener('mousemove', handleCanvasMouseMove);
        canvas.removeEventListener('mouseup', handleCanvasMouseUp);
        canvas.removeEventListener('mouseleave', handleCanvasMouseUp);
        window.removeEventListener('keydown', handleKeyDown);

        canvas.onmousedown = originalMouseDown;
        canvas.onmousemove = originalMouseMove;
        canvas.onmouseup = originalMouseUp;

        originalAttach?.();
    };
};

onMounted(() => {
    if (containerRef.value) {
        resizeObserver = new ResizeObserver(updateCanvasSize);
        resizeObserver.observe(containerRef.value);
    }
    updateCanvasBounds();
    detachListeners = customAttachListeners();
});

onUnmounted(() => {
    resizeObserver?.disconnect();
    detachListeners?.();
    isEditInteraction.value = false;
});

watch(
    [shapes, selectedId, curveDrawing, isEditingMode, editingCurve, zoom],
    () => {
        if (editingCurve.value) {
            editingCurve.value.getBoundingBox();
        }
        // Обновляем границы при изменении зума
        updateCanvasBounds();
        requestAnimationFrame(customDraw);
    },
    { deep: true }
);
</script>

<template>
    <div ref="containerRef" class="canvas-wrapper">
        <canvas ref="canvasRef" class="main-canvas"></canvas>
    </div>
</template>

<style scoped>
.canvas-wrapper {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: #ffffff;
    position: relative;
    display: block;
}

.main-canvas {
    display: block;
    width: 100%;
    height: 100%;
    cursor: default;
}
</style>

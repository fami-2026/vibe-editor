<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useCanvasStore } from '@/stores/canvas';
import { useCanvasRender } from '@/canvas/composables/useCanvasRender';
import { useInteractions } from '@/canvas/composables/useInteractions';
import type { CurveShapeWrapper } from '@/canvas/types/curve/curve';
import type { Point } from '@/canvas/types';

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const canvasStore = useCanvasStore();
const { shapes, selectedId, curveDrawing, editingCurve, isEditingMode } =
    storeToRefs(canvasStore);
const canvasStore = useCanvasStore();
const { shapes, selectedId, curveDrawing, editingCurve, isEditingMode } =
    storeToRefs(canvasStore);

const { draw } = useCanvasRender(canvasRef, shapes, selectedId);
const { attachListeners } = useInteractions(canvasRef, shapes);

let resizeObserver: ResizeObserver | null = null;
let detachListeners: (() => void) | undefined;

const draggedPointIndex = ref<number | null>(null);
const isDragging = ref(false);
const lastMousePos = ref<{ x: number; y: number } | null>(null);
const initialPoints = ref<{ x: number; y: number }[]>([]);
const isEditInteraction = ref(false);

const updateCanvasSize = () => {
    if (!containerRef.value || !canvasRef.value) return;
    const { clientWidth, clientHeight } = containerRef.value;
    if (
        canvasRef.value.width !== clientWidth ||
        canvasRef.value.height !== clientHeight
    ) {
    if (canvasRef.value.width !== clientWidth || canvasRef.value.height !== clientHeight) {
        canvasRef.value.width = clientWidth;
        canvasRef.value.height = clientHeight;
        draw();
        drawTemporaryPoints();
        drawTemporaryPoints();
    }
};

const drawTemporaryPoints = () => {
    if (!canvasRef.value) return;
    const ctx = canvasRef.value.getContext('2d');
    if (!ctx) return;

    ctx.save();

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
        const points = editingCurve.value
            .getGlobalPoints()
            .filter((p) => p !== undefined && p !== null);

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
                    ctx.strokeStyle = '#2196f3';
                    ctx.lineWidth = 4;
                    ctx.stroke();
                }
            }
        }

        points.forEach((point, index) => {
            if (!point) return;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
            ctx.fillStyle =
                index === 0 || index === points.length - 1
                    ? '#4CAF50'
                    : '#FF9800';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();

            if (isDragging.value && draggedPointIndex.value === index) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 12, 0, 2 * Math.PI);
                ctx.strokeStyle = '#f44336';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
    }

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

function getSplinePoints(points: Point[]): Point[] {
    if (points.length < 2) return points;
    const result: Point[] = [];

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1] : points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];

        if (!p1 || !p2) continue;

        for (let s = 0; s <= 20; s++) {
            const t = s / 20;
            const x =
                0.5 *
                (2 * (p1?.x || 0) +
                    (-(p0?.x || 0) + (p2?.x || 0)) * t +
                    (2 * (p0?.x || 0) -
                        5 * (p1?.x || 0) +
                        4 * (p2?.x || 0) -
                        (p3?.x || 0)) *
                        t *
                        t +
                    (-(p0?.x || 0) +
                        3 * (p1?.x || 0) -
                        3 * (p2?.x || 0) +
                        (p3?.x || 0)) *
                        t *
                        t *
                        t);
            const y =
                0.5 *
                (2 * (p1?.y || 0) +
                    (-(p0?.y || 0) + (p2?.y || 0)) * t +
                    (2 * (p0?.y || 0) -
                        5 * (p1?.y || 0) +
                        4 * (p2?.y || 0) -
                        (p3?.y || 0)) *
                        t *
                        t +
                    (-(p0?.y || 0) +
                        3 * (p1?.y || 0) -
                        3 * (p2?.y || 0) +
                        (p3?.y || 0)) *
                        t *
                        t *
                        t);
            result.push({ x, y });
        }
    }
    return result;
}

function findClosestPointIndex(x: number, y: number): number {
    if (!editingCurve.value) return -1;
    const points = editingCurve.value
        .getGlobalPoints()
        .filter((p) => p !== undefined && p !== null);
    const threshold = 15;
    let minDist = Infinity;
    let closestIndex = -1;

    points.forEach((point, index) => {
        if (!point) return;
        const dist = Math.hypot(point.x - x, point.y - y);
        if (dist < minDist && dist < threshold) {
            minDist = dist;
            closestIndex = index;
        }
    });
    return closestIndex;
}

function catmullRomPoint(
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    t: number
): Point {
    const t2 = t * t;
    const t3 = t2 * t;

    const x =
        0.5 *
        (2 * (p1?.x || 0) +
            (-(p0?.x || 0) + (p2?.x || 0)) * t +
            (2 * (p0?.x || 0) -
                5 * (p1?.x || 0) +
                4 * (p2?.x || 0) -
                (p3?.x || 0)) *
                t2 +
            (-(p0?.x || 0) +
                3 * (p1?.x || 0) -
                3 * (p2?.x || 0) +
                (p3?.x || 0)) *
                t3);

    const y =
        0.5 *
        (2 * (p1?.y || 0) +
            (-(p0?.y || 0) + (p2?.y || 0)) * t +
            (2 * (p0?.y || 0) -
                5 * (p1?.y || 0) +
                4 * (p2?.y || 0) -
                (p3?.y || 0)) *
                t2 +
            (-(p0?.y || 0) +
                3 * (p1?.y || 0) -
                3 * (p2?.y || 0) +
                (p3?.y || 0)) *
                t3);

    return { x, y };
}

function splitSegment(index: number): number {
    if (!editingCurve.value) return index;

    const points = editingCurve.value
        .getGlobalPoints()
        .filter((p): p is Point => p !== undefined && p !== null);

    if (index > 0 && index < points.length - 1) {
        // Убеждаемся, что все нужные точки существуют
        const pPrev = points[index - 1];
        const pCurr = points[index];
        const pNext = points[index + 1];
        const pNextNext =
            index + 2 < points.length ? points[index + 2] : points[index + 1];

        if (!pPrev || !pCurr || !pNext || !pNextNext) return index;

        const point1 = catmullRomPoint(pPrev, pPrev, pCurr, pNext, 0.5);
        const point2 = catmullRomPoint(pPrev, pCurr, pNext, pNextNext, 0.5);

        const newPoints = [
            ...points.slice(0, index),
            point1,
            pCurr,
            point2,
            ...points.slice(index + 1),
        ];

        editingCurve.value.setGlobalPoints(newPoints);
        return index + 1;
    }
    return index;
}

const handleCanvasClick = (e: MouseEvent) => {
    if (!canvasRef.value) return;
    const rect = canvasRef.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (canvasStore.curveDrawing) {
        canvasStore.handleCanvasClick(x, y);
        e.stopPropagation();
        customDraw();
    }
};

const handleCanvasDoubleClick = (e: MouseEvent) => {
    if (!canvasRef.value || isEditingMode.value) return;
    const rect = canvasRef.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const shape of canvasStore.shapes) {
        if (shape?.type === 'curve' && shape.hitTest({ x, y })) {
            canvasStore.editCurve(shape as CurveShapeWrapper);
            e.stopPropagation();
            break;
        }
    }
};

const handleCanvasMouseDown = (e: MouseEvent) => {
    if (!canvasRef.value || !isEditingMode.value || !editingCurve.value) return;

    const rect = canvasRef.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pointIndex = findClosestPointIndex(x, y);
    if (pointIndex !== -1) {
        e.preventDefault();
        e.stopPropagation();
        isEditInteraction.value = true;
        draggedPointIndex.value = pointIndex;
        lastMousePos.value = { x, y };
        isDragging.value = true;
        const globalPoints = editingCurve.value
            .getGlobalPoints()
            .filter((p) => p !== undefined && p !== null);
        initialPoints.value = globalPoints.map((p) => ({ ...p }));
    }
};

const handleCanvasMouseMove = (e: MouseEvent) => {
    if (
        !isDragging.value ||
        draggedPointIndex.value === null ||
        !editingCurve.value ||
        !lastMousePos.value
    )
        return;

    e.preventDefault();
    e.stopPropagation();

    const rect = canvasRef.value!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const deltaX = x - lastMousePos.value.x;
    const deltaY = y - lastMousePos.value.y;
    const pointIndex = draggedPointIndex.value;

    if (pointIndex >= 0 && pointIndex < initialPoints.value.length) {
        const newPoints = initialPoints.value.map((p, idx) => {
            if (!p) return { x: 0, y: 0 };
            if (idx === pointIndex) {
                return { x: p.x + deltaX, y: p.y + deltaY };
            }
            return { ...p };
        });
        editingCurve.value.setGlobalPoints(newPoints);
    }
    customDraw();
};

const handleCanvasMouseUp = (e: MouseEvent) => {
    if (
        isDragging.value &&
        editingCurve.value &&
        draggedPointIndex.value !== null
    ) {
        e.preventDefault();
        e.stopPropagation();

        const points = editingCurve.value
            .getGlobalPoints()
            .filter((p) => p !== undefined && p !== null);
        const draggedIndex = draggedPointIndex.value;
        const initialPoint = initialPoints.value[draggedIndex];
        const currentPoint = points[draggedIndex];

        if (initialPoint && currentPoint) {
            const moved =
                Math.hypot(
                    currentPoint.x - initialPoint.x,
                    currentPoint.y - initialPoint.y
                ) > 1;
            if (moved && draggedIndex > 0 && draggedIndex < points.length - 1) {
                draggedPointIndex.value = splitSegment(draggedIndex);
            }
        }
        canvasStore.pushHistoryForCurve();
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
};

const customDraw = () => {
    draw();
    drawTemporaryPoints();
};

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

    const originalMouseDown = canvas.onmousedown;
    const originalMouseMove = canvas.onmousemove;
    const originalMouseUp = canvas.onmouseup;

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
    detachListeners = customAttachListeners();
});

onUnmounted(() => {
    resizeObserver?.disconnect();
    detachListeners?.();
    isEditInteraction.value = false;
    isEditInteraction.value = false;
});

watch(
    [shapes, selectedId, curveDrawing, isEditingMode],
    () => requestAnimationFrame(customDraw),
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

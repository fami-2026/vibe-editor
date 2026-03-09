<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useCanvasStore } from '@/stores/canvas';
import { useCanvasRender } from '@/canvas/composables/useCanvasRender';
import { useInteractions } from '@/canvas/composables/useInteractions';
<<<<<<< HEAD
import type { CurveShapeWrapper } from '@/canvas/types/curve/curve';
import type { Point } from '@/canvas/types';
=======
import CurveEditDialog from '@/gui/components/CurveEditDialog.vue';
import type { EditableCurve } from '@/stores/canvas';
import type { CurveShapeWrapper } from '@/canvas/types/curve/curve';
>>>>>>> 20f7f18 (пофиксил)

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

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
    if (canvasRef.value.width !== clientWidth || canvasRef.value.height !== clientHeight) {
        canvasRef.value.width = clientWidth;
        canvasRef.value.height = clientHeight;
        draw();
        drawTemporaryPoints();
    }
};

const drawTemporaryPoints = () => {
<<<<<<< HEAD
    if (!canvasRef.value) return;
    const ctx = canvasRef.value.getContext('2d');
    if (!ctx) return;
    
    if (curveDrawing.value) {
        const points = curveDrawing.value.points;
        points.forEach((point, index) => {
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
        const points = editingCurve.value.getGlobalPoints();
        
        ctx.beginPath();
        const splinePoints = getSplinePoints(points);
        ctx.moveTo(splinePoints[0].x, splinePoints[0].y);
        for (let i = 1; i < splinePoints.length; i++) {
            ctx.lineTo(splinePoints[i].x, splinePoints[i].y);
        }
        ctx.strokeStyle = '#2196f3';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        points.forEach((point, index) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = (index === 0 || index === points.length - 1) ? '#4CAF50' : '#FF9800';
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
        
=======
    if (!canvasRef.value || !curveDrawing.value) return;

    const ctx = canvasRef.value.getContext('2d');
    if (!ctx) return;

    const points = curveDrawing.value.points;

    points.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);

        if (index === 0) {
            ctx.fillStyle = '#4CAF50';
        } else {
            ctx.fillStyle = '#F44336';
        }

        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    if (points.length === 1) {
>>>>>>> a454dd7 (ops/bot: #25: format and lint)
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666';
<<<<<<< HEAD
        ctx.fillText('Режим редактирования: перетаскивайте точки, Enter для выхода', 20, 30);
=======
        ctx.fillText('Кликните для конечной точки', 20, 30);
>>>>>>> 20f7f18 (пофиксил)
    }
};

function getSplinePoints(points: { x: number; y: number }[]): { x: number; y: number }[] {
    if (points.length < 2) return points;
    const result: { x: number; y: number }[] = [];
    
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1] : points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];
        
        for (let s = 0; s <= 20; s++) {
            const t = s / 20;
            const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t * t + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t * t * t);
            const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t * t + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t * t * t);
            result.push({ x, y });
        }
    }
    return result;
}

function findClosestPointIndex(x: number, y: number): number {
    if (!editingCurve.value) return -1;
    const points = editingCurve.value.getGlobalPoints();
    const threshold = 15;
    let minDist = Infinity;
    let closestIndex = -1;
    
    points.forEach((point, index) => {
        const dist = Math.hypot(point.x - x, point.y - y);
        if (dist < minDist && dist < threshold) {
            minDist = dist;
            closestIndex = index;
        }
    });
    return closestIndex;
}

function getPointOnCurveAtSegment(points: Point[], segmentIndex: number, t: number): Point {
    const i = segmentIndex;
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];
    
    const t2 = t * t;
    const t3 = t2 * t;
    
    const x = 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );
    
    const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );
    
    return { x, y };
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
        if (shape.type === 'curve' && shape.hitTest({ x, y })) {
<<<<<<< HEAD
            canvasStore.editCurve(shape as CurveShapeWrapper);
            e.stopPropagation();
=======
            console.log('🔍 Double clicked on curve:', shape);
            canvasStore.editCurve(shape as CurveShapeWrapper);
>>>>>>> 20f7f18 (пофиксил)
            break;
        }
    }
};

<<<<<<< HEAD
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
        initialPoints.value = editingCurve.value.getGlobalPoints().map(p => ({ ...p }));
    }
=======
const handleCurveUpdate = (updatedCurve: EditableCurve) => {
    canvasStore.tempCurve = updatedCurve;
>>>>>>> 20f7f18 (пофиксил)
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
        initialPoints.value = editingCurve.value.getGlobalPoints().map(p => ({ ...p }));
    }
};

const handleCanvasMouseMove = (e: MouseEvent) => {
    if (!isDragging.value || draggedPointIndex.value === null || !editingCurve.value || !lastMousePos.value) return;
    
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
            if (idx === pointIndex) {
                return { x: p.x + deltaX, y: p.y + deltaY };
            }
            return { ...p };
        });
        editingCurve.value.setGlobalPoints(newPoints);
    }
    customDraw();
};

const handleCanvasMouseMove = (e: MouseEvent) => {
    if (!isDragging.value || draggedPointIndex.value === null || !editingCurve.value || !lastMousePos.value) return;
    
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
    if (isDragging.value && editingCurve.value && draggedPointIndex.value !== null) {
        e.preventDefault();
        e.stopPropagation();
        
        const points = editingCurve.value.getGlobalPoints();
        const draggedIndex = draggedPointIndex.value;
        const initialPoint = initialPoints.value[draggedIndex];
        const currentPoint = points[draggedIndex];
        
        if (initialPoint && currentPoint) {
            const moved = Math.hypot(currentPoint.x - initialPoint.x, currentPoint.y - initialPoint.y) > 1;
            if (moved && draggedIndex > 0 && draggedIndex < points.length - 1) {
                const point1 = getPointOnCurveAtSegment(points, draggedIndex - 1, 0.5);
                const point2 = getPointOnCurveAtSegment(points, draggedIndex, 0.5);
                
                const newPoints = [
                    ...points.slice(0, draggedIndex),
                    point1,
                    points[draggedIndex],
                    point2,
                    ...points.slice(draggedIndex + 1)
                ];
                
                editingCurve.value.setGlobalPoints(newPoints);
                draggedPointIndex.value = draggedIndex + 1;
            }
        }
        canvasStore.pushHistoryForCurve();
    }
    
    isDragging.value = false;
    draggedPointIndex.value = null;
    lastMousePos.value = null;
    initialPoints.value = [];
    
    setTimeout(() => { isEditInteraction.value = false; }, 100);
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
<<<<<<< HEAD
    isEditInteraction.value = false;
});

watch([shapes, selectedId, curveDrawing, isEditingMode], () => requestAnimationFrame(customDraw), { deep: true });
=======

    if (canvasRef.value) {
        canvasRef.value.removeEventListener('click', handleCanvasClick);
        canvasRef.value.removeEventListener(
            'dblclick',
            handleCanvasDoubleClick
        );
    }
});

watch(
    [shapes, selectedId, curveDrawing],
    () => requestAnimationFrame(customDraw),
    { deep: true }
);
>>>>>>> a454dd7 (ops/bot: #25: format and lint)
</script>

<template>
    <div ref="containerRef" class="canvas-wrapper">
        <canvas ref="canvasRef" class="main-canvas"></canvas>
        
        <!-- Подсказки поверх канваса -->
        <div class="hints">
            <div v-if="curveDrawing" class="hint">
                <p v-if="curveDrawing.points.length === 1">
                    👆 Кликните для конечной точки
                </p>
            </div>
            
            <div v-if="isEditingMode" class="hint editing-hint">
                <p>✏️ Режим редактирования: перетаскивайте точки, Enter для выхода</p>
            </div>
        </div>
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
.hints {
    position: absolute;
    top: 20px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    pointer-events: none;
    z-index: 10;
}
.hint {
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px 20px;
    border-radius: 30px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    animation: fadeIn 0.3s ease;
}
.editing-hint {
    background: rgba(33, 150, 243, 0.9);
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
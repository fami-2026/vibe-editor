import { ref, type Ref } from 'vue';
import type { Shape, Point } from '@/canvas/types';
import { useCanvasStore } from '@/stores/canvas';
import { useToolsStore } from '@/stores/tools';

/**
 * Composable для управления взаимодействиями пользователя (мышь, drag&drop).
 */
export function useInteractions(
    canvasRef: Ref<HTMLCanvasElement | null>,
    shapes: Ref<Shape[]>
) {
    const canvasStore = useCanvasStore();
    const toolsStore = useToolsStore();
    const isDragging = ref(false);
    const dragStart = ref<Point>({ x: 0, y: 0 });
    const activeShape = ref<Shape | null>(null);

    function getLocalPoint(e: MouseEvent): Point {
        const rect = canvasRef.value?.getBoundingClientRect();
        return rect
            ? { x: e.clientX - rect.left, y: e.clientY - rect.top }
            : { x: 0, y: 0 };
    }

    /**
     * Находит фигуру под курсором (слои проверяются с последней на первую).
     */
    function hitTest(point: Point): Shape | null {
        for (let i = shapes.value.length - 1; i >= 0; i--) {
            const shape = shapes.value[i];
            if (shape?.hitTest(point)) return shape;
        }
        return null;
    }

    function onMouseDown(e: MouseEvent) {
        const point = getLocalPoint(e);
        const shape = hitTest(point);
        const activeTool = toolsStore.activeTool;

        // режим ластика — удаляем фигуру под курсором
        if (activeTool === 'eraser') {
            if (shape) {
                canvasStore.deleteShape(shape.id);
            }
            return;
        }

        // обычный режим выбора и перетаскивания
        canvasStore.selectShape(shape?.id ?? null);

        if (shape) {
            isDragging.value = true;
            activeShape.value = shape;
            dragStart.value = point;
        }
    }

    function onMouseMove(e: MouseEvent) {
        const point = getLocalPoint(e);
        const canvas = canvasRef.value;

        if (isDragging.value && activeShape.value) {
            const dx = point.x - dragStart.value.x;
            const dy = point.y - dragStart.value.y;

            activeShape.value.move({ x: dx, y: dy });
            dragStart.value = point;

            if (canvas) canvas.style.cursor = 'grabbing';
        } else {
            const hover = hitTest(point);
            if (canvas) canvas.style.cursor = hover ? 'grab' : 'default';
        }
    }

    function onMouseUp() {
        isDragging.value = false;
        activeShape.value = null;
        if (canvasRef.value) canvasRef.value.style.cursor = 'grab';
    }

    function attachListeners() {
        const el = canvasRef.value;
        if (!el) return;
        el.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            el.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }

    return { attachListeners };
}

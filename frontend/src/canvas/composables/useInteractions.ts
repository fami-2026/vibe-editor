import { ref, type Ref } from 'vue';
import type { Shape, Point } from '@/canvas/types';
import type { TransformHandle } from '@/canvas/utils/handles';
import { HandleType } from '@/canvas/utils/handles';
import { useCanvasStore } from '@/stores/canvas';
import { TransformUtils } from '@/canvas/utils/transform';

/**
 * Composable для управления взаимодействиями пользователя (мышь, drag&drop, трансформация).
 */
export function useInteractions(
    canvasRef: Ref<HTMLCanvasElement | null>,
    shapes: Ref<Shape[]>
) {
    const canvasStore = useCanvasStore();
    const isDragging = ref(false);
    const dragStart = ref<Point>({ x: 0, y: 0 });
    const activeShape = ref<Shape | null>(null);
    const activeHandle = ref<TransformHandle | null>(null);
    const preserveAspect = ref(false); // Для сохранения пропорций при Shift

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

    /**
     * Находит handle выбранной фигуры.
     */
    function hitTestHandle(point: Point, shape: Shape): TransformHandle | null {
        const handles = shape.getTransformHandles();
        return handles.hitTest(point, 8);
    }

    function onMouseDown(e: MouseEvent) {
        const point = getLocalPoint(e);
        const selectedId = canvasStore.selectedId;
        const selectedShape = selectedId ? shapes.value.find(s => s.id === selectedId) ?? null : null;

        // Отслеживаем Shift для сохранения пропорций
        preserveAspect.value = e.shiftKey;

        if (selectedShape) {
            const handle = hitTestHandle(point, selectedShape);
            if (handle) {
                canvasStore.selectShape(selectedShape.id);
                activeHandle.value = handle;
                activeShape.value = selectedShape;
                isDragging.value = true;
                dragStart.value = point;
                return;
            }
        }

        const shape = hitTest(point);

        canvasStore.selectShape(shape?.id ?? null);

        if (shape) {
            // Проверяем сначала handles
            const handle = hitTestHandle(point, shape);
            if (handle) {
                activeHandle.value = handle;
                activeShape.value = shape;
                isDragging.value = true;
                dragStart.value = point;
            } else {
                // Если не handle, то просто перемещение
                isDragging.value = true;
                activeShape.value = shape;
                dragStart.value = point;
                activeHandle.value = null;
            }
        }
    }

    function onMouseMove(e: MouseEvent) {
        const point = getLocalPoint(e);
        const canvas = canvasRef.value;

        // Обновляем флаг сохранения пропорций при движении
        preserveAspect.value = e.shiftKey;

        if (isDragging.value && activeShape.value) {
            if (activeHandle.value) {
                transformShape(activeShape.value as unknown as import('@/canvas/types').BaseShape, activeHandle.value, dragStart.value, point);
                dragStart.value = point;
            } else {
                // Обычное перемещение
                const dx = point.x - dragStart.value.x;
                const dy = point.y - dragStart.value.y;

                activeShape.value.move({ x: dx, y: dy });
                dragStart.value = point;
            }

            if (canvas) canvas.style.cursor = 'grabbing';
        } else {
            // Сначала проверим handles выделенной фигуры (они могут быть вне её bounds)
            const selectedId = canvasStore.selectedId;
            const selectedShape = selectedId ? shapes.value.find(s => s.id === selectedId) ?? null : null;
            if (selectedShape) {
                const handle = hitTestHandle(point, selectedShape);
                if (handle) {
                    if (canvas) canvas.style.cursor = handle.cursor;
                    return;
                }
            }

            // Показываем корректный курсор при наведении на фигуру/handles других фигур
            const shape = hitTest(point);
            if (shape) {
                const handle = hitTestHandle(point, shape);
                if (handle) {
                    if (canvas) canvas.style.cursor = handle.cursor;
                } else {
                    if (canvas) canvas.style.cursor = 'grab';
                }
            } else {
                if (canvas) canvas.style.cursor = 'default';
            }
        }
    }

    function transformShape(shape: Shape, handle: TransformHandle, from: Point, to: Point): void {
        const gdx = to.x - from.x;
        const gdy = to.y - from.y;

        const inv = shape.getTransformMatrix().invert();
        const localFrom = inv.transformPoint(from);
        const localTo = inv.transformPoint(to);
        const ldx = localTo.x - localFrom.x;
        const ldy = localTo.y - localFrom.y;

        // 1. ИСКЛЮЧЕНИЕ ДЛЯ ЛИНИИ: 
        // Линия имеет свою идеальную абсолютную математику вращения и перемещения.
        // Полностью отдаём ей управление и прерываем выполнение.
        if (shape.type === 'line') {
            shape.transformByHandle(handle.id, { x: ldx, y: ldy }, { x: gdx, y: gdy }, preserveAspect.value, from, to);
            return;
        }

        // 2. БАЗОВОЕ ПОВЕДЕНИЕ ДЛЯ ОСТАЛЬНЫХ ФИГУР (Круг, Прямоугольник)
        // Пока они не переписаны на 100% автономность, оставляем старую логику для них:
        if (handle.id === HandleType.CENTER) {
            shape.move({ x: gdx, y: gdy });
            return;
        }

        if (handle.id === HandleType.ROTATE) {
            const angleFrom = TransformUtils.angle(shape.position, from);
            const angleTo = TransformUtils.angle(shape.position, to);
            let angleDelta = ((angleTo - angleFrom) * 180) / Math.PI;
            while (angleDelta > 180) angleDelta -= 360;
            while (angleDelta < -180) angleDelta += 360;
            shape.rotate(angleDelta);
            return;
        }

        // 3. Делегируем остальные маркеры (растягивание, углы) самой фигуре
        shape.transformByHandle(handle.id, { x: ldx, y: ldy }, { x: gdx, y: gdy }, preserveAspect.value, from, to);
    }

    function onMouseUp() {
        isDragging.value = false;
        activeShape.value = null;
        activeHandle.value = null;
        if (canvasRef.value) canvasRef.value.style.cursor = 'default';
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

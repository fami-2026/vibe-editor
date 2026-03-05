import type { Ref } from 'vue';
import type { Shape } from '@/canvas/types';

/**
 * Composable для отрисовки фигур на канвасе.
 */
export function useCanvasRender(
    canvasRef: Ref<HTMLCanvasElement | null>,
    shapes: Ref<Shape[]>,
    selectedId: Ref<string | null>
) {
    /**
     * Рисует рамку выделения вокруг фигуры.
     */
    function drawSelectionBox(ctx: CanvasRenderingContext2D, shape: Shape) {
        const { minX, minY, maxX, maxY } = shape.getBoundingBox();
        ctx.save();
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.restore();
    }

    /**
     * Рисует точки трансформации.
     */
    function drawTransformHandles(ctx: CanvasRenderingContext2D, shape: Shape) {
        const handles = shape.getTransformHandles().getAll();

        ctx.save();

        for (const handle of handles) {
            if (handle.id === 'rotate') {
                // Желтая точка для поворота (больше радиус, чтобы соответствовать hit area)
                ctx.fillStyle = '#FFC107';
                ctx.strokeStyle = '#FFA000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(handle.position.x, handle.position.y, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else {
                // Синие точки для остальных handle'ов (слегка больше для удобства)
                ctx.fillStyle = '#2196F3';
                ctx.strokeStyle = '#1976D2';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(handle.position.x, handle.position.y, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    /**
     * Основной цикл отрисовки. Очищает канвас и отрисовывает все фигуры.
     */
    function draw() {
        const canvas = canvasRef.value;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const shape of shapes.value) {
            ctx.save();
            shape.render(ctx);
            ctx.restore();

            if (shape.id === selectedId.value) {
                drawSelectionBox(ctx, shape);
                drawTransformHandles(ctx, shape);
            }
        }
    }

    return { draw };
}

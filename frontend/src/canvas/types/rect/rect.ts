/**
 * Прямоугольник, центрирован в позиции.
 */
import { Editable } from '../property';
import type { BoundingBox, Point } from '../base';
import { BaseShape } from '../base';
import { shapeRegistry } from '../registry';

export class RectShape extends BaseShape {
    type = 'rect';

    @Editable({ label: 'Width', type: 'number', min: 1 })
    width: number;

    @Editable({ label: 'Height', type: 'number', min: 1 })
    height: number;

    @Editable({ label: 'Fill', type: 'color' })
    fill: string;

    @Editable({
        label: 'Fill Opacity',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
    })
    fillOpacity: number = 1;

    @Editable({ label: 'Stroke', type: 'color' })
    stroke: string;

    @Editable({
        label: 'Stroke Opacity',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
    })
    strokeOpacity: number = 1;

    @Editable({
        label: 'Stroke Width',
        type: 'number',
        min: 0.5,
        max: 20,
        step: 0.5,
    })
    strokeWidth: number;

    /**
     * @param id Идентификатор
     * @param position Центр прямоугольника
     * @param width Ширина (по умолчанию 100)
     * @param height Высота (по умолчанию 80)
     * @param fill Цвет заливки (по умолчанию #e74c3c)
     * @param stroke Цвет границы (по умолчанию #2c3e50)
     * @param strokeWidth Толщина границы (по умолчанию 2)
     */
    constructor(
        id: string,
        position: Point,
        width: number = 100,
        height: number = 80,
        fill: string = '#e74c3c',
        stroke: string = '#2c3e50',
        strokeWidth: number = 2
    ) {
        super(id, position);
        this.width = width;
        this.height = height;
        this.fill = fill;
        this.stroke = stroke;
        this.strokeWidth = strokeWidth;
    }

    hitTest(point: Point): boolean {
        const bbox = this.getBoundingBox();
        return (
            point.x >= bbox.minX &&
            point.x <= bbox.maxX &&
            point.y >= bbox.minY &&
            point.y <= bbox.maxY
        );
    }

    getBoundingBox(): BoundingBox {
        return {
            minX: this.position.x - this.width / 2,
            minY: this.position.y - this.height / 2,
            maxX: this.position.x + this.width / 2,
            maxY: this.position.y + this.height / 2,
        };
    }

    render(ctx: CanvasRenderingContext2D): void {
        const x = this.position.x - this.width / 2;
        const y = this.position.y - this.height / 2;

        // Заливка
        ctx.save();
        ctx.fillStyle = this.fill;
        if (typeof this.fillOpacity === 'number') {
            ctx.globalAlpha = this.fillOpacity;
        }
        ctx.fillRect(x, y, this.width, this.height);
        ctx.restore();

        // Обводка
        ctx.save();
        ctx.strokeStyle = this.stroke;
        ctx.lineWidth = this.strokeWidth;
        if (typeof this.strokeOpacity === 'number') {
            ctx.globalAlpha = this.strokeOpacity;
        }
        ctx.strokeRect(x, y, this.width, this.height);
        ctx.restore();
    }

    move(delta: Point): void {
        this.position.x += delta.x;
        this.position.y += delta.y;
    }
}

shapeRegistry.register('rect', RectShape);

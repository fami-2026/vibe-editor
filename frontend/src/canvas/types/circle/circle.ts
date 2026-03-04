/**
 * Круг или эллипс.
 */
import { Editable } from '../property';
import type { BoundingBox, Point } from '../base';
import { BaseShape } from '../base';
import { shapeRegistry } from '../registry';

export class CircleShape extends BaseShape {
    type = 'circle';

    @Editable({ label: 'Radius X', type: 'number', min: 1 })
    radiusX: number;

    @Editable({ label: 'Radius Y', type: 'number', min: 1 })
    radiusY: number;

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
     * @param position Центр круга
     * @param radiusX Горизонтальный радиус (по умолчанию 50)
     * @param radiusY Вертикальный радиус (по умолчанию 50)
     * @param fill Цвет заливки (по умолчанию #3498db)
     * @param stroke Цвет границы (по умолчанию #2c3e50)
     * @param strokeWidth Толщина границы (по умолчанию 2)
     */
    constructor(
        id: string,
        position: Point,
        radiusX: number = 50,
        radiusY: number = 50,
        fill: string = '#3498db',
        stroke: string = '#2c3e50',
        strokeWidth: number = 2
    ) {
        super(id, position);
        this.radiusX = radiusX;
        this.radiusY = radiusY;
        this.fill = fill;
        this.stroke = stroke;
        this.strokeWidth = strokeWidth;
    }

    hitTest(point: Point): boolean {
        const dx = point.x - this.position.x;
        const dy = point.y - this.position.y;

        const padding = this.strokeWidth / 2 + 3;
        const rX = this.radiusX + padding;
        const rY = this.radiusY + padding;

        return (dx / rX) * (dx / rX) + (dy / rY) * (dy / rY) <= 1;
    }

    getBoundingBox(): BoundingBox {
        return {
            minX: this.position.x - this.radiusX,
            minY: this.position.y - this.radiusY,
            maxX: this.position.x + this.radiusX,
            maxY: this.position.y + this.radiusY,
        };
    }

    render(ctx: CanvasRenderingContext2D): void {
        // Заливка
        ctx.save();
        ctx.fillStyle = this.fill;
        if (typeof this.fillOpacity === 'number') {
            ctx.globalAlpha = this.fillOpacity;
        }
        ctx.beginPath();
        ctx.ellipse(
            this.position.x,
            this.position.y,
            this.radiusX,
            this.radiusY,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.restore();

        // Обводка
        ctx.save();
        ctx.strokeStyle = this.stroke;
        ctx.lineWidth = this.strokeWidth;
        if (typeof this.strokeOpacity === 'number') {
            ctx.globalAlpha = this.strokeOpacity;
        }
        ctx.beginPath();
        ctx.ellipse(
            this.position.x,
            this.position.y,
            this.radiusX,
            this.radiusY,
            0,
            0,
            Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
    }

    move(delta: Point): void {
        this.position.x += delta.x;
        this.position.y += delta.y;
    }
}

shapeRegistry.register('circle', CircleShape);

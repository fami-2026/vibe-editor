/**
 * Отрезок прямой с началом и концом.
 */
import { Editable, HideProperties } from '../property';
import type { BoundingBox, Point } from '../base';
import { BaseShape } from '../base';
import { shapeRegistry } from '../registry';

@HideProperties(['x', 'y'])
export class LineShape extends BaseShape {
    type = 'line';

    @Editable({ label: 'Stroke Color', type: 'color' })
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
        min: 1,
        max: 50,
        step: 0.5,
    })
    strokeWidth: number;

    @Editable({ label: 'Start X', type: 'number' })
    get startX(): number {
        return this.position.x;
    }
    set startX(v: number) {
        this.position.x = v;
    }

    @Editable({ label: 'Start Y', type: 'number' })
    get startY(): number {
        return this.position.y;
    }
    set startY(v: number) {
        this.position.y = v;
    }

    @Editable({ label: 'End X', type: 'number' })
    get endX(): number {
        return this.endPoint.x;
    }
    set endX(v: number) {
        this.endPoint.x = v;
    }

    @Editable({ label: 'End Y', type: 'number' })
    get endY(): number {
        return this.endPoint.y;
    }
    set endY(v: number) {
        this.endPoint.y = v;
    }

    /**
     * @param id Идентификатор
     * @param position Начало линии
     * @param endPoint Конец линии (по умолчанию +100 по X и Y от position)
     * @param stroke Цвет границы (по умолчанию #2c3e50)
     * @param strokeWidth Толщина границы (по умолчанию 2)
     */
    constructor(
        id: string,
        position: Point,
        endPoint: Point = { x: position.x + 100, y: position.y + 100 },
        stroke: string = '#2c3e50',
        strokeWidth: number = 2
    ) {
        super(id, position);
        this.points = [{ ...endPoint }];
        this.stroke = stroke;
        this.strokeWidth = strokeWidth;
    }

    get endPoint(): Point {
        return this.points?.[0] ?? this.position;
    }

    set endPoint(point: Point) {
        if (this.points) {
            this.points[0] = { ...point };
        } else {
            this.points = [{ ...point }];
        }
    }

    hitTest(point: Point): boolean {
        const dx = this.endPoint.x - this.position.x;
        const dy = this.endPoint.y - this.position.y;
        const lenSquared = dx * dx + dy * dy;

        if (lenSquared === 0) {
            const dist = Math.sqrt(
                Math.pow(point.x - this.position.x, 2) +
                    Math.pow(point.y - this.position.y, 2)
            );
            return dist <= this.strokeWidth / 2 + 3;
        }

        let t =
            ((point.x - this.position.x) * dx +
                (point.y - this.position.y) * dy) /
            lenSquared;
        t = Math.max(0, Math.min(1, t));

        const projX = this.position.x + t * dx;
        const projY = this.position.y + t * dy;

        const distToLine = Math.sqrt(
            Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2)
        );

        return distToLine <= this.strokeWidth / 2 + 3;
    }

    getBoundingBox(): BoundingBox {
        const minX = Math.min(this.position.x, this.endPoint.x);
        const maxX = Math.max(this.position.x, this.endPoint.x);
        const minY = Math.min(this.position.y, this.endPoint.y);
        const maxY = Math.max(this.position.y, this.endPoint.y);

        const padding = this.strokeWidth / 2 + 5;
        return {
            minX: minX - padding,
            minY: minY - padding,
            maxX: maxX + padding,
            maxY: maxY + padding,
        };
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        ctx.strokeStyle = this.stroke;
        ctx.lineWidth = this.strokeWidth;
        ctx.lineCap = 'round';

        if (typeof this.strokeOpacity === 'number') {
            ctx.globalAlpha = this.strokeOpacity;
        }

        ctx.beginPath();
        ctx.moveTo(this.position.x, this.position.y);
        ctx.lineTo(this.endPoint.x, this.endPoint.y);
        ctx.stroke();

        ctx.restore();
    }

    move(delta: Point): void {
        this.position.x += delta.x;
        this.position.y += delta.y;

        if (this.points && this.points[0]) {
            this.points[0].x += delta.x;
            this.points[0].y += delta.y;
        }
    }
}

shapeRegistry.register('line', LineShape);

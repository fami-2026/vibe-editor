import type { BoundingBox, Point } from '../base';
import { BaseShape } from '../base';
import { Editable, HideProperties } from '../property';
import { shapeRegistry } from '../registry';

export interface CurveParams {
    points: Point[];  // Точки в локальных координатах относительно position
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
}

@HideProperties(['x', 'y', 'points']) // Скрываем ненужные свойства
export class CurveShape extends BaseShape {
    type = 'curve';

    private anchorPoints: Point[] = []; // Опорные точки

    @Editable({ label: 'Цвет обводки', type: 'color' })
    stroke: string;

    @Editable({
        label: 'Прозрачность обводки',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05
    })
    strokeOpacity: number = 1;

    @Editable({
        label: 'Толщина обводки',
        type: 'number',
        min: 0.5,
        max: 20,
        step: 0.5
    })
    strokeWidth: number;

    @Editable({ label: 'Поворот', type: 'number', min: 0, max: 360, step: 1 })
    rotation: number = 0;

    @Editable({ label: 'Масштаб X', type: 'number', min: -5, max: 5, step: 0.1 })
    get scaleX(): number {
        return this._scaleX;
    }
    set scaleX(v: number) {
        this._scaleX = this.processScaleUpdate(v, this._scaleX);
    }

    @Editable({ label: 'Масштаб Y', type: 'number', min: -5, max: 5, step: 0.1 })
    get scaleY(): number {
        return this._scaleY;
    }
    set scaleY(v: number) {
        this._scaleY = this.processScaleUpdate(v, this._scaleY);
    }

    constructor(
        id: string,
        position: Point,
        params: CurveParams
    ) {
        super(id, position);
        
        this.anchorPoints = params.points.map(p => ({ ...p }));
        
        this.stroke = params.stroke || '#000000';
        this.strokeOpacity = params.strokeOpacity || 1;
        this.strokeWidth = params.strokeWidth || 2;
    }

    getGlobalPoints(): Point[] {
        return this.anchorPoints.map(p => this.toGlobalPoint(p));
    }

    setGlobalPoints(points: Point[]) {
        if (points.length === 0) return;
        
        const sumX = points.reduce((acc, p) => acc + p.x, 0);
        const sumY = points.reduce((acc, p) => acc + p.y, 0);
        const centerX = sumX / points.length;
        const centerY = sumY / points.length;
        
        this.position.x = centerX;
        this.position.y = centerY;
        
        this.anchorPoints = points.map(p => this.toVLocalPoint(p));
    }

    // Получить все точки для отрисовки кривой Безье
    private getCurvePoints(): Point[] {
        if (this.anchorPoints.length < 2) return [];
        
        const result: Point[] = [];
        const steps = 30;
        
        for (let i = 0; i < this.anchorPoints.length - 1; i++) {
            const p0 = i > 0 ? this.anchorPoints[i - 1] : this.anchorPoints[i];
            const p1 = this.anchorPoints[i];
            const p2 = this.anchorPoints[i + 1];
            const p3 = i < this.anchorPoints.length - 2 ? this.anchorPoints[i + 2] : this.anchorPoints[i + 1];
            
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                
                const x = 0.5 * (
                    (2 * p1.x) + 
                    (-p0.x + p2.x) * t + 
                    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t * t + 
                    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t * t * t
                );
                
                const y = 0.5 * (
                    (2 * p1.y) + 
                    (-p0.y + p2.y) * t + 
                    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t * t + 
                    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t * t * t
                );
                
                if (s > 0 || i === 0) {
                    result.push({ x, y });
                }
            }
        }
        
        return result;
    }

    // Получить точку на кривой в глобальных координатах
    getPointOnCurveAtSegment(segmentIndex: number, t: number): Point {
        if (segmentIndex < 0 || segmentIndex >= this.anchorPoints.length - 1) {
            return { x: 0, y: 0 };
        }
        
        const i = segmentIndex;
        const p0 = i > 0 ? this.anchorPoints[i - 1] : this.anchorPoints[i];
        const p1 = this.anchorPoints[i];
        const p2 = this.anchorPoints[i + 1];
        const p3 = i < this.anchorPoints.length - 2 ? this.anchorPoints[i + 2] : this.anchorPoints[i + 1];
        
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
        
        return this.toGlobalPoint({ x, y });
    }

    // Вставить новую опорную точку
    insertAnchorPoint(index: number, point: Point) {
        const localPoint = this.toVLocalPoint(point);
        this.anchorPoints.splice(index, 0, localPoint);
    }

    addPoint(index: number, globalPoint: Point) {
        const localPoint = this.toVLocalPoint(globalPoint);
        this.anchorPoints.splice(index, 0, localPoint);
    }

    removePoint(index: number) {
        if (this.anchorPoints.length > 2) {
            this.anchorPoints.splice(index, 1);
        }
    }

    setSize(width: number, height: number): void {
        const globalPoints = this.anchorPoints.map(p => this.toGlobalPoint(p));
        
        const minX = Math.min(...globalPoints.map(p => p.x));
        const minY = Math.min(...globalPoints.map(p => p.y));
        const maxX = Math.max(...globalPoints.map(p => p.x));
        const maxY = Math.max(...globalPoints.map(p => p.y));
        
        const currentWidth = maxX - minX;
        const currentHeight = maxY - minY;
        
        if (currentWidth === 0 || currentHeight === 0) return;
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        const scaleX = width / currentWidth;
        const scaleY = height / currentHeight;
        
        const scaledPoints = globalPoints.map(p => ({
            x: centerX + (p.x - centerX) * scaleX,
            y: centerY + (p.y - centerY) * scaleY
        }));
        
        this.setGlobalPoints(scaledPoints);
    }

    getLocalBox(): BoundingBox {
        if (this.anchorPoints.length === 0) {
            return { minX: -50, minY: -50, maxX: 50, maxY: 50 };
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        for (const p of this.anchorPoints) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }

        return { minX, minY, maxX, maxY };
    }

    getBoundingBox(): BoundingBox {
        const localBox = this.getLocalBox();
        
        const padding = Math.max(this.strokeWidth * 2, 20);
        
        const expandedLocalBox = {
            minX: localBox.minX - padding,
            minY: localBox.minY - padding,
            maxX: localBox.maxX + padding,
            maxY: localBox.maxY + padding
        };
        
        const corners = [
            this.toGlobalPoint({ x: expandedLocalBox.minX, y: expandedLocalBox.minY }),
            this.toGlobalPoint({ x: expandedLocalBox.maxX, y: expandedLocalBox.minY }),
            this.toGlobalPoint({ x: expandedLocalBox.maxX, y: expandedLocalBox.maxY }),
            this.toGlobalPoint({ x: expandedLocalBox.minX, y: expandedLocalBox.maxY }),
        ];

        return {
            minX: Math.min(...corners.map((p) => p.x)),
            minY: Math.min(...corners.map((p) => p.y)),
            maxX: Math.max(...corners.map((p) => p.x)),
            maxY: Math.max(...corners.map((p) => p.y)),
        };
    }

    hitTest(globalPoint: Point): boolean {
        const localPoint = this.toVLocalPoint(globalPoint);
        const padding = this.strokeWidth / 2 + 3;
        
        const curvePoints = this.getCurvePoints();
        
        for (let i = 0; i < curvePoints.length - 1; i++) {
            const p1 = curvePoints[i];
            const p2 = curvePoints[i + 1];
            
            const dist = this.distanceToSegment(localPoint, p1, p2);
            if (dist <= padding) return true;
        }
        
        return false;
    }

    private distanceToSegment(p: Point, a: Point, b: Point): number {
        const ab = { x: b.x - a.x, y: b.y - a.y };
        const ap = { x: p.x - a.x, y: p.y - a.y };
        
        const t = (ab.x * ap.x + ab.y * ap.y) / (ab.x * ab.x + ab.y * ab.y);
        
        if (t < 0) return Math.hypot(p.x - a.x, p.y - a.y);
        if (t > 1) return Math.hypot(p.x - b.x, p.y - b.y);
        
        const proj = { x: a.x + t * ab.x, y: a.y + t * ab.y };
        return Math.hypot(p.x - proj.x, p.y - proj.y);
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        
        const m = this.getVMatrix();
        ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
        
        const sx = Math.sign(this.scaleX);
        const sy = Math.sign(this.scaleY);
        ctx.scale(sx, sy);

        const curvePoints = this.getCurvePoints();
        
        if (curvePoints.length > 1) {
            ctx.beginPath();
            ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
            
            for (let i = 1; i < curvePoints.length; i++) {
                ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
            }
            
            ctx.strokeStyle = this.stroke;
            ctx.lineWidth = this.strokeWidth;
            ctx.globalAlpha = this.strokeOpacity;
            ctx.stroke();
        }

        ctx.restore();
    }

    move(delta: Point): void {
        this.position.x += delta.x;
        this.position.y += delta.y;
    }
}

export class CurveShapeWrapper extends CurveShape {
    constructor(id: string, position: Point) {
        const globalPoints = [
            { x: position.x, y: position.y },
            { x: position.x + 50, y: position.y },
            { x: position.x + 100, y: position.y }
        ];
        
        const sumX = globalPoints.reduce((acc, p) => acc + p.x, 0);
        const sumY = globalPoints.reduce((acc, p) => acc + p.y, 0);
        const centerX = sumX / globalPoints.length;
        const centerY = sumY / globalPoints.length;
        
        const localPoints = globalPoints.map(p => ({
            x: p.x - centerX,
            y: p.y - centerY
        }));
        
        super(id, { x: centerX, y: centerY }, { points: localPoints });
    }
}

shapeRegistry.register('curve', CurveShapeWrapper);
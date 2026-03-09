/**
 * Кривая
 */
import type { BoundingBox, Point } from '../base';
import { BaseShape } from '../base';
import { shapeRegistry } from '../registry';

export interface CurveParams {
    points: Point[];  // Точки в локальных координатах относительно position
    stroke?: string;
    strokeOpacity?: number;
    strokeWidth?: number;
}

export class CurveShape extends BaseShape {
    type = 'curve';

    private localPoints: Point[] = [];
    stroke: string;
    strokeOpacity: number = 1;
    strokeWidth: number;

    constructor(
        id: string,
        position: Point,
        params: CurveParams
    ) {
        super(id, position);
        
        this.localPoints = params.points.map(p => ({ ...p }));
        
        this.stroke = params.stroke || '#000000';
        this.strokeOpacity = params.strokeOpacity || 1;
        this.strokeWidth = params.strokeWidth || 2;
    }

    getGlobalPoints(): Point[] {
        return this.localPoints.map(p => ({
            x: this.position.x + p.x * this.scaleX,
            y: this.position.y + p.y * this.scaleY
        }));
    }

    setGlobalPoints(points: Point[]) {
        if (points.length === 0) return;
        
        const sumX = points.reduce((acc, p) => acc + p.x, 0);
        const sumY = points.reduce((acc, p) => acc + p.y, 0);
        const centerX = sumX / points.length;
        const centerY = sumY / points.length;
        
        this.position.x = centerX;
        this.position.y = centerY;
        
        this.localPoints = points.map(p => ({
            x: p.x - centerX,
            y: p.y - centerY
        }));
    }

    addPoint(index: number, globalPoint: Point) {
        const localPoint = {
            x: globalPoint.x - this.position.x,
            y: globalPoint.y - this.position.y
        };
        this.localPoints.splice(index, 0, localPoint);
    }

    removePoint(index: number) {
        if (this.localPoints.length > 2) {
            this.localPoints.splice(index, 1);
        }
    }

    setSize(width: number, height: number): void {
        const minX = Math.min(...this.localPoints.map(p => p.x));
        const minY = Math.min(...this.localPoints.map(p => p.y));
        const maxX = Math.max(...this.localPoints.map(p => p.x));
        const maxY = Math.max(...this.localPoints.map(p => p.y));
        
        const currentWidth = maxX - minX;
        const currentHeight = maxY - minY;
        
        if (currentWidth === 0 || currentHeight === 0) return;
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        const scaleX = width / currentWidth;
        const scaleY = height / currentHeight;
        
        this.localPoints = this.localPoints.map(p => ({
            x: centerX + (p.x - centerX) * scaleX,
            y: centerY + (p.y - centerY) * scaleY
        }));
    }

    getLocalBox(): BoundingBox {
        if (this.localPoints.length === 0) {
            return { minX: -50, minY: -50, maxX: 50, maxY: 50 };
        }

        const splinePoints = this.getSplinePoints();
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        for (const p of this.localPoints) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        
        for (const p of splinePoints) {
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

    private getSplinePoints(): Point[] {
        if (this.localPoints.length < 2) return [];
        
        const result: Point[] = [];
        const segments = 20;
        
        for (let i = 0; i < this.localPoints.length - 1; i++) {
            const p0 = i > 0 ? this.localPoints[i - 1] : this.localPoints[i];
            const p1 = this.localPoints[i];
            const p2 = this.localPoints[i + 1];
            const p3 = i < this.localPoints.length - 2 ? this.localPoints[i + 2] : this.localPoints[i + 1];
            
            for (let s = 0; s <= segments; s++) {
                const t = s / segments;
                
                const x = 0.5 * (
                    (2 * p1.x) + (-p0.x + p2.x) * t +
                    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t * t +
                    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t * t * t
                );
                
                const y = 0.5 * (
                    (2 * p1.y) + (-p0.y + p2.y) * t +
                    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t * t +
                    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t * t * t
                );
                
                result.push({ x, y });
            }
        }
        
        return result;
    }

    hitTest(globalPoint: Point): boolean {
        const localPoint = this.toVLocalPoint(globalPoint);
        const padding = this.strokeWidth / 2 + 3;
        
        const splinePoints = this.getSplinePoints();
        
        for (let i = 0; i < splinePoints.length - 1; i++) {
            const p1 = splinePoints[i];
            const p2 = splinePoints[i + 1];
            
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

        const splinePoints = this.getSplinePoints();
        
        if (splinePoints.length > 1) {
            ctx.beginPath();
            ctx.moveTo(splinePoints[0].x, splinePoints[0].y);
            
            for (let i = 1; i < splinePoints.length; i++) {
                ctx.lineTo(splinePoints[i].x, splinePoints[i].y);
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
        // Точки в глобальных координатах
        const globalPoints = [
            { x: position.x, y: position.y },
            { x: position.x + 50, y: position.y },
            { x: position.x + 100, y: position.y }
        ];
        
        // Вычисляем центр масс
        const sumX = globalPoints.reduce((acc, p) => acc + p.x, 0);
        const sumY = globalPoints.reduce((acc, p) => acc + p.y, 0);
        const centerX = sumX / globalPoints.length;
        const centerY = sumY / globalPoints.length;
        
        // Создаем локальные точки относительно центра
        const localPoints = globalPoints.map(p => ({
            x: p.x - centerX,
            y: p.y - centerY
        }));
        
        super(id, { x: centerX, y: centerY }, { points: localPoints });
    }
}

shapeRegistry.register('curve', CurveShapeWrapper);

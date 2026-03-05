/**
 * Отрезок прямой с началом и концом.
 */
import { Editable, HideProperties } from '../property';
import type { BoundingBox, Point } from '../base';
import { BaseShape } from '../base';
import { shapeRegistry } from '../registry';
import type { TransformHandles } from '@/canvas/utils/handles';
import { TransformHandles as TransformHandlesClass, HandleType, TransformHandle, transformLocalHandles } from '@/canvas/utils/handles';
import { TransformUtils } from '@/canvas/utils/transform';
import { AffineMatrix } from '@/canvas/utils/transform';

@HideProperties(['x', 'y', 'rotation', 'scaleX', 'scaleY', 'skewX', 'skewY', 'flipX', 'flipY'])
export class LineShape extends BaseShape {
    type = 'line';

    @Editable({ label: 'Stroke Color', type: 'color' })
    stroke: string;

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

    protected hitTestLocal(point: Point): boolean {
        // локальные: старт в (0,0), конец = endPoint - position
        const dx = this.endPoint.x - this.position.x;
        const dy = this.endPoint.y - this.position.y;
        const lenSquared = dx * dx + dy * dy;

        if (lenSquared === 0) {
            const dist = Math.sqrt(point.x * point.x + point.y * point.y);
            return dist <= this.strokeWidth / 2 + 3;
        }

        let t = (point.x * dx + point.y * dy) / lenSquared;
        t = Math.max(0, Math.min(1, t));

        const projX = t * dx;
        const projY = t * dy;

        const distToLine = Math.sqrt(
            Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2)
        );

        return distToLine <= this.strokeWidth / 2 + 3;
    }

    getBoundingBox(): BoundingBox {
        const dx = this.endPoint.x - this.position.x;
        const dy = this.endPoint.y - this.position.y;
        const localPoints = [
            { x: 0, y: 0 },
            { x: dx, y: dy },
        ];
        const bbox = this.computeBoundingBoxFromLocal(localPoints);
        const padding = this.strokeWidth / 2 + 5;
        return {
            minX: bbox.minX - padding,
            minY: bbox.minY - padding,
            maxX: bbox.maxX + padding,
            maxY: bbox.maxY + padding,
        };
    }

    // шаблонизованный рендер; drawShape делает рисование на локальных координатах
    protected drawShape(ctx: CanvasRenderingContext2D): void {
        ctx.lineCap = 'round';
        const dx = this.endPoint.x - this.position.x;
        const dy = this.endPoint.y - this.position.y;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(dx, dy);
        ctx.stroke();
    }

    move(delta: Point): void {
        // при перемещении сдвигаем оба конца на один и тот же вектор
        this.position.x += delta.x;
        this.position.y += delta.y;

        if (this.points && this.points[0]) {
            this.points[0].x += delta.x;
            this.points[0].y += delta.y;
        }

        this.markTransformDirty();
    }

    transformByHandle(
        handle: HandleType,
        localDelta: Point,
        globalDelta: Point,
        preserveAspect: boolean,
        from?: Point,
        to?: Point
    ): void {
        switch (handle) {
            case HandleType.TOP_LEFT: {
                if (preserveAspect && from && to) {
                    const fixed = this.endPoint;
                    const currentVector = { x: this.position.x - fixed.x, y: this.position.y - fixed.y };
                    const targetVector = { x: to.x - fixed.x, y: to.y - fixed.y };
                    const currentAngle = Math.atan2(currentVector.y, currentVector.x);
                    const targetAngle = Math.atan2(targetVector.y, targetVector.x);
                    const angleDelta = targetAngle - currentAngle;
                    const cos = Math.cos(angleDelta);
                    const sin = Math.sin(angleDelta);
                    const dx = this.position.x - fixed.x;
                    const dy = this.position.y - fixed.y;
                    this.position.x = fixed.x + dx * cos - dy * sin;
                    this.position.y = fixed.y + dx * sin + dy * cos;
                } else if (to) {
                    this.position.x = to.x;
                    this.position.y = to.y;
                }
                this.markTransformDirty();
                return;
            }

            case HandleType.BOTTOM_RIGHT: {
                if (preserveAspect && from && to) {
                    const fixed = this.position;
                    const currentVector = { x: this.endPoint.x - fixed.x, y: this.endPoint.y - fixed.y };
                    const targetVector = { x: to.x - fixed.x, y: to.y - fixed.y };
                    const currentAngle = Math.atan2(currentVector.y, currentVector.x);
                    const targetAngle = Math.atan2(targetVector.y, targetVector.x);
                    const angleDelta = targetAngle - currentAngle;
                    const cos = Math.cos(angleDelta);
                    const sin = Math.sin(angleDelta);
                    const dx = this.endPoint.x - fixed.x;
                    const dy = this.endPoint.y - fixed.y;
                    this.endPoint.x = fixed.x + dx * cos - dy * sin;
                    this.endPoint.y = fixed.y + dx * sin + dy * cos;
                } else if (to) {
                    this.endPoint.x = to.x;
                    this.endPoint.y = to.y;
                }
                this.markTransformDirty();
                return;
            }

            case HandleType.CENTER:
                this.move(globalDelta);
                return;

            case HandleType.ROTATE:
                if (to) {
                    // 1. Находим центр линии (вокруг которого крутим)
                    const cx = (this.position.x + this.endPoint.x) / 2;
                    const cy = (this.position.y + this.endPoint.y) / 2;

                    // 2. Находим абсолютный угол мыши относительно центра
                    const mouseAngle = Math.atan2(to.y - cy, to.x - cx);

                    // 3. Так как маркер поворота находится строго перпендикулярно линии (под углом -90 градусов),
                    // сама линия должна быть повернута на +90 градусов (Math.PI / 2) относительно мыши
                    const targetLineAngle = mouseAngle + Math.PI / 2;

                    // 4. Узнаем текущую длину (точнее её половину)
                    const dx = this.endPoint.x - this.position.x;
                    const dy = this.endPoint.y - this.position.y;
                    const halfLen = Math.hypot(dx, dy) / 2;

                    // 5. Применяем новые координаты, строго фиксируя центр
                    const cos = Math.cos(targetLineAngle);
                    const sin = Math.sin(targetLineAngle);

                    this.position.x = cx - halfLen * cos;
                    this.position.y = cy - halfLen * sin;
                    
                    this.endPoint.x = cx + halfLen * cos;
                    this.endPoint.y = cy + halfLen * sin;

                    this.markTransformDirty();
                }
                return;
        }
    }

    // Линия не использует свойства вращения/масштаба из BaseShape –
    // все изменения осуществляются напрямую с координатами концов.
    getTransformHandles(): TransformHandles {
        const dx = this.endPoint.x - this.position.x;
        const dy = this.endPoint.y - this.position.y;
        const m = this.getTransformMatrix();
        
        const handles = new TransformHandlesClass();
        
        // Масштабируемые handles
        const scalableHandles = transformLocalHandles([
                { id: HandleType.TOP_LEFT, local: { x: 0, y: 0 }, cursor: 'nwse-resize', label: 'Start' },
                { id: HandleType.BOTTOM_RIGHT, local: { x: dx, y: dy }, cursor: 'nwse-resize', label: 'End' },
                { id: HandleType.CENTER, local: { x: dx / 2, y: dy / 2 }, cursor: 'move', label: 'Center' },
            ],
            m
        );
        
        // Добавляем масштабируемые handles
        scalableHandles.getAll().forEach(h => handles.add(h));
        
        // --- ИСПРАВЛЕНИЕ: ПРАВИЛЬНЫЙ РАСЧЕТ РУЧКИ ПОВОРОТА ---
        const len = Math.hypot(dx, dy);
        let nx = 0;
        let ny = -1; // По умолчанию вектор смотрит вверх
        
        if (len > 0) {
            // Вычисляем вектор нормали (перпендикуляр к линии)
            nx = dy / len;
            ny = -dx / len;
        }

        const ROTATION_OFFSET_PX = 25; // фиксированное расстояние в пикселях от линии
        
        // Позиция маркера: середина линии + смещение строго по перпендикуляру
        const rotateLocalPos = {
            x: dx / 2 + nx * ROTATION_OFFSET_PX,
            y: dy / 2 + ny * ROTATION_OFFSET_PX
        };

        const rotateGlobalPos = m.transformPoint(rotateLocalPos);
        handles.add(new TransformHandle(HandleType.ROTATE, rotateGlobalPos, 'crosshair', 'Rotate'));
        
        return handles;
    }

    /**
     * Перезаписываем вращение для линии: вместо изменения параметра rotation
     * перемещаем оба конца вокруг серединной точки.
     */
    rotate(angleDeg: number): void {
        if (angleDeg === 0) return;
        const center = {
            x: (this.position.x + this.endPoint.x) / 2,
            y: (this.position.y + this.endPoint.y) / 2,
        };
        const rad = (angleDeg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const rotatePt = (p: Point): Point => {
            const dx = p.x - center.x;
            const dy = p.y - center.y;
            return {
                x: center.x + dx * cos - dy * sin,
                y: center.y + dx * sin + dy * cos,
            };
        };

        this.position = rotatePt(this.position);
        this.endPoint = rotatePt(this.endPoint);
        // сохраняем rotation без изменений
    }

    /**
     * Линия не должна применять дополнительные повороты/масштабы в матрице;
     * используем только трансляцию, чтобы высвободить её от двойного преобразования.
     */
    getTransformMatrix(): AffineMatrix {
        // отсутствуют вращение/масштаб/скос – возвращаем только перенос
        return AffineMatrix.translation(this.position.x, this.position.y);
    }
}

shapeRegistry.register('line', LineShape);

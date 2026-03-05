/**
 * Круг или эллипс.
 */
import { Editable } from '../property';
import type { BoundingBox, Point } from '../base';
import { BaseShape } from '../base';
import { shapeRegistry } from '../registry';
import type { TransformHandles } from '@/canvas/utils/handles';
import { HandleType, TransformHandle, TransformHandles as TransformHandlesClass, transformLocalHandles } from '@/canvas/utils/handles';

export class CircleShape extends BaseShape {
    type = 'circle';

    @Editable({ label: 'Radius X', type: 'number', min: 1 })
    radiusX: number;

    @Editable({ label: 'Radius Y', type: 'number', min: 1 })
    radiusY: number;

    @Editable({ label: 'Fill', type: 'color' })
    fill: string;

    @Editable({ label: 'Stroke', type: 'color' })
    stroke: string;

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

    protected hitTestLocal(point: Point): boolean {
        // local coordinates, center at (0,0) with radii radiusX, radiusY
        const dx = point.x;
        const dy = point.y;
        return (dx / this.radiusX) * (dx / this.radiusX) + (dy / this.radiusY) * (dy / this.radiusY) <= 1;
    }

    getBoundingBox(): BoundingBox {
        // используем четыре cardinal points, затем трансформируем
        const localPoints = [
            { x: -this.radiusX, y: 0 },
            { x: this.radiusX, y: 0 },
            { x: 0, y: -this.radiusY },
            { x: 0, y: this.radiusY },
        ];
        return this.computeBoundingBoxFromLocal(localPoints);
    }

    // Используем шаблонный метод в BaseShape
    protected drawShape(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radiusX, this.radiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    move(delta: Point): void {
        this.position.x += delta.x;
        this.position.y += delta.y;
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
            case HandleType.CENTER:
                this.move(globalDelta);
                break;

            case HandleType.RIGHT: {
                // Убрали умножение на 2. Смещение края на deltaX равно увеличению радиуса на deltaX.
                this.radiusX = Math.max(1, this.radiusX + localDelta.x);
                this.markTransformDirty();
                break;
            }

            case HandleType.BOTTOM: {
                // Убрали умножение на 2.
                this.radiusY = Math.max(1, this.radiusY + localDelta.y);
                this.markTransformDirty();
                break;
            }

            case HandleType.BOTTOM_RIGHT: {
                // Маркер находится на границе круга под углом 45 градусов: 
                // X = radiusX / √2, Y = radiusY / √2
                const diagX = this.radiusX / Math.SQRT2;
                const diagY = this.radiusY / Math.SQRT2;

                // Новая желаемая позиция маркера под курсором мыши
                const newDiagX = diagX + localDelta.x;
                const newDiagY = diagY + localDelta.y;

                if (preserveAspect) {
                    // Сохраняем пропорции круга/эллипса, ориентируясь на удаление мыши от центра
                    const origDist = Math.hypot(diagX, diagY);
                    const newDist = Math.hypot(newDiagX, newDiagY);
                    
                    // Избегаем деления на 0
                    if (origDist > 0) {
                        const scale = newDist / origDist;
                        this.radiusX = Math.max(1, this.radiusX * scale);
                        this.radiusY = Math.max(1, this.radiusY * scale);
                    }
                } else {
                    // Свободное растягивание диагонали
                    // Чтобы маркер остался в (newDiagX, newDiagY), умножаем обратно на √2
                    this.radiusX = Math.max(1, newDiagX * Math.SQRT2);
                    this.radiusY = Math.max(1, newDiagY * Math.SQRT2);
                }
                
                this.markTransformDirty();
                break;
            }
        }
    }

    getTransformHandles(): TransformHandles {
        const m = this.getTransformMatrix();
        const diagX = this.radiusX / Math.SQRT2;
        const diagY = this.radiusY / Math.SQRT2;

        const handles = new TransformHandlesClass();
        
        // Масштабируемые handles
        const scalableHandles = transformLocalHandles(
            [
                { id: HandleType.RIGHT, local: { x: this.radiusX, y: 0 }, cursor: 'ew-resize', label: 'Radius X' },
                { id: HandleType.BOTTOM, local: { x: 0, y: this.radiusY }, cursor: 'ns-resize', label: 'Radius Y' },
                { id: HandleType.BOTTOM_RIGHT, local: { x: diagX, y: diagY }, cursor: 'nwse-resize', label: 'Scale Uniform' },
                { id: HandleType.CENTER, local: { x: 0, y: 0 }, cursor: 'move', label: 'Center' },
            ],
            m
        );
        
        // Добавляем масштабируемые handles
        scalableHandles.getAll().forEach(h => handles.add(h));
        
        // Ручка поворота на фиксированном расстоянии в экранных координатах
        const topPointLocal = { x: 0, y: -this.radiusY };
        const topPointGlobal = m.transformPoint(topPointLocal);
        const ROTATION_OFFSET_PX = 10; // фиксированное расстояние в пикселях
        const rotateGlobalPos = { x: topPointGlobal.x, y: topPointGlobal.y - ROTATION_OFFSET_PX };
        handles.add(new TransformHandle(HandleType.ROTATE, rotateGlobalPos, 'crosshair', 'Rotate'));
        
        return handles;
    }

}

shapeRegistry.register('circle', CircleShape);

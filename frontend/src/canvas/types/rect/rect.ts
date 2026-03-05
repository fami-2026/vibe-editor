/**
 * Прямоугольник, центрирован в позиции.
 */
import { Editable } from '../property';
import type { BoundingBox, Point } from '../base';
import { BaseShape } from '../base';
import { shapeRegistry } from '../registry';
import type { TransformHandles } from '@/canvas/utils/handles';
import { HandleType, TransformHandle, TransformHandles as TransformHandlesClass, transformLocalHandles } from '@/canvas/utils/handles';

export class RectShape extends BaseShape {
    type = 'rect';

    @Editable({ label: 'Width', type: 'number', min: 1 })
    width: number;

    @Editable({ label: 'Height', type: 'number', min: 1 })
    height: number;

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

    protected hitTestLocal(point: Point): boolean {
        // локальные координаты, центр в (0,0)
        return (
            point.x >= -this.width / 2 &&
            point.x <= this.width / 2 &&
            point.y >= -this.height / 2 &&
            point.y <= this.height / 2
        );
    }

    getBoundingBox(): BoundingBox {
        // строим bbox на основе четырёх углов в локальныхcoords
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        const localPoints = [
            { x: -halfW, y: -halfH },
            { x: halfW, y: -halfH },
            { x: halfW, y: halfH },
            { x: -halfW, y: halfH },
        ];
        return this.computeBoundingBoxFromLocal(localPoints);
    }

    // использует шаблонный метод render() из BaseShape
    protected drawShape(ctx: CanvasRenderingContext2D): void {
        const x = -this.width / 2;
        const y = -this.height / 2;
        ctx.fillRect(x, y, this.width, this.height);
        ctx.strokeRect(x, y, this.width, this.height);
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
        // Для прямоугольника работаем напрямую с width и height
        // Локальная дельта уже преобразована в координаты фигуры
        
        switch (handle) {
            case HandleType.CENTER:
                this.move(globalDelta);
                break;

            case HandleType.TOP_LEFT:
            case HandleType.TOP_RIGHT:
            case HandleType.BOTTOM_LEFT:
            case HandleType.BOTTOM_RIGHT: {
                const isLeft = handle === HandleType.TOP_LEFT || handle === HandleType.BOTTOM_LEFT;
                const isTop = handle === HandleType.TOP_LEFT || handle === HandleType.TOP_RIGHT;

                // Угол находится на halfW/halfH от центра
                // Движение на ldx меняет размер на 2*ldx (для обеих сторон)
                let newWidth = this.width - (isLeft ? 2 * localDelta.x : -2 * localDelta.x);
                let newHeight = this.height - (isTop ? 2 * localDelta.y : -2 * localDelta.y);

                newWidth = Math.max(1, newWidth);
                newHeight = Math.max(1, newHeight);

                if (preserveAspect) {
                    // Сохраняем пропорции: используем наименьшее изменение
                    const widthRatio = newWidth / this.width;
                    const heightRatio = newHeight / this.height;
                    const ratio = Math.min(widthRatio, heightRatio);
                    this.width *= ratio;
                    this.height *= ratio;
                } else {
                    this.width = newWidth;
                    this.height = newHeight;
                }
                this.markTransformDirty();
                break;
            }

            case HandleType.TOP: {
                const newHeight = this.height - 2 * localDelta.y;
                this.height = Math.max(1, newHeight);
                this.markTransformDirty();
                break;
            }

            case HandleType.BOTTOM: {
                const newHeight = this.height + 2 * localDelta.y;
                this.height = Math.max(1, newHeight);
                this.markTransformDirty();
                break;
            }

            case HandleType.LEFT: {
                const newWidth = this.width - 2 * localDelta.x;
                this.width = Math.max(1, newWidth);
                this.markTransformDirty();
                break;
            }

            case HandleType.RIGHT: {
                const newWidth = this.width + 2 * localDelta.x;
                this.width = Math.max(1, newWidth);
                this.markTransformDirty();
                break;
            }
        }
    }

    getTransformHandles(): TransformHandles {
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        const m = this.getTransformMatrix();

        const handles = new TransformHandlesClass();
        
        // Масштабируемые handles
        const scalableHandles = transformLocalHandles(
            [
                { id: HandleType.TOP_LEFT, local: { x: -halfW, y: -halfH }, cursor: 'nwse-resize', label: 'Top-Left' },
                { id: HandleType.TOP_RIGHT, local: { x: halfW, y: -halfH }, cursor: 'nesw-resize', label: 'Top-Right' },
                { id: HandleType.BOTTOM_LEFT, local: { x: -halfW, y: halfH }, cursor: 'nesw-resize', label: 'Bottom-Left' },
                { id: HandleType.BOTTOM_RIGHT, local: { x: halfW, y: halfH }, cursor: 'nwse-resize', label: 'Bottom-Right' },
                { id: HandleType.TOP, local: { x: 0, y: -halfH }, cursor: 'ns-resize', label: 'Top' },
                { id: HandleType.BOTTOM, local: { x: 0, y: halfH }, cursor: 'ns-resize', label: 'Bottom' },
                { id: HandleType.LEFT, local: { x: -halfW, y: 0 }, cursor: 'ew-resize', label: 'Left' },
                { id: HandleType.RIGHT, local: { x: halfW, y: 0 }, cursor: 'ew-resize', label: 'Right' },
                { id: HandleType.CENTER, local: { x: 0, y: 0 }, cursor: 'move', label: 'Center' },
            ],
            m
        );
        
        // Добавляем масштабируемые handles
        scalableHandles.getAll().forEach(h => handles.add(h));
        
        // Ручка поворота на фиксированном расстоянии в экранных координатах
        const topPointLocal = { x: 0, y: -halfH };
        const topPointGlobal = m.transformPoint(topPointLocal);
        const ROTATION_OFFSET_PX = 18; // фиксированное расстояние в пикселях
        const rotateGlobalPos = { x: topPointGlobal.x, y: topPointGlobal.y - ROTATION_OFFSET_PX };
        handles.add(new TransformHandle(HandleType.ROTATE, rotateGlobalPos, 'crosshair', 'Rotate'));
        
        return handles;
    }
}

shapeRegistry.register('rect', RectShape);

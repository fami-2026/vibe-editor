import { HANDLE_RADIUS, ROTATION_HANDLE_OFFSET } from '@/canvas/constants';

/**
 * Точки трансформации (handles) для фигур.
 */

export interface Point {
    x: number;
    y: number;
}

export enum HandleType {
    // Углы для изменения размера
    TOP_LEFT = 'tl',
    TOP_RIGHT = 'tr',
    BOTTOM_LEFT = 'bl',
    BOTTOM_RIGHT = 'br',

    // Середины сторон для растяжения
    TOP = 't',
    BOTTOM = 'b',
    LEFT = 'l',
    RIGHT = 'r',

    // Поворот
    ROTATE = 'rotate',

    // Центр
    CENTER = 'center',
}

/**
 * Описание точки трансформации.
 */
export class TransformHandle {
    readonly HANDLE_RADIUS = HANDLE_RADIUS;

    constructor(
        readonly id: HandleType,
        readonly position: Point,
        readonly cursor: string = 'pointer',
        readonly label: string = ''
    ) {}

    /**
     * Проверяет, находится ли точка в радиусе handle.
     */
    contains(point: Point, radius: number = this.HANDLE_RADIUS): boolean {
        const dx = point.x - this.position.x;
        const dy = point.y - this.position.y;
        return dx * dx + dy * dy <= radius * radius;
    }

    /**
     * Клонирует handle с новой позицией.
     */
    withPosition(position: Point): TransformHandle {
        return new TransformHandle(this.id, position, this.cursor, this.label);
    }
}

/**
 * Хранилище точек трансформации для фигуры.
 */
export class TransformHandles {
    private handles: TransformHandle[] = [];

    /**
     * Добавляет handle.
     */
    add(handle: TransformHandle): this {
        this.handles.push(handle);
        return this;
    }

    /**
     * Получает все handles.
     */
    getAll(): TransformHandle[] {
        return [...this.handles];
    }

    /**
     * Находит handle по позиции точки.
     */
    hitTest(point: Point, radius?: number): TransformHandle | null {
        for (const handle of this.handles) {
            if (handle.contains(point, radius)) {
                return handle;
            }
        }
        return null;
    }

    /**
     * Получает handle по ID.
     */
    getById(id: HandleType): TransformHandle | null {
        return this.handles.find(h => h.id === id) ?? null;
    }

    /**
     * Очищает все handles.
     */
    clear(): this {
        this.handles = [];
        return this;
    }

    /**
     * Обновляет позиции всех handles.
     */
    updatePositions(positionMap: Map<HandleType, Point>): this {
        this.handles = this.handles.map(handle => {
            const newPos = positionMap.get(handle.id);
            return newPos ? handle.withPosition(newPos) : handle;
        });
        return this;
    }
}

/**
 * Параметры трансформации.
 */
export interface TransformState {
    // Масштабирование
    scaleX: number;
    scaleY: number;

    // Поворот в радианах
    rotation: number;

    // Сдвиг (скос)
    skewX: number;
    skewY: number;

    // Отражение
    flipX: boolean;
    flipY: boolean;
}

/**
 * Создает стандартный набор handles для прямоугольной области.
 */
export function createRectHandles(minX: number, minY: number, maxX: number, maxY: number): TransformHandles {
    const handles = new TransformHandles();

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    const cursorMap = {
        tl: 'nwse-resize',
        tr: 'nesw-resize',
        bl: 'nesw-resize',
        br: 'nwse-resize',
        t: 'ns-resize',
        b: 'ns-resize',
        l: 'ew-resize',
        r: 'ew-resize',
        rotate: 'crosshair',
        center: 'move',
    };

    // Углы
    handles
        .add(new TransformHandle(HandleType.TOP_LEFT, { x: minX, y: minY }, cursorMap.tl, 'Top-Left'))
        .add(new TransformHandle(HandleType.TOP_RIGHT, { x: maxX, y: minY }, cursorMap.tr, 'Top-Right'))
        .add(new TransformHandle(HandleType.BOTTOM_LEFT, { x: minX, y: maxY }, cursorMap.bl, 'Bottom-Left'))
        .add(new TransformHandle(HandleType.BOTTOM_RIGHT, { x: maxX, y: maxY }, cursorMap.br, 'Bottom-Right'))

        // Середины сторон
        .add(new TransformHandle(HandleType.TOP, { x: midX, y: minY }, cursorMap.t, 'Top'))
        .add(new TransformHandle(HandleType.BOTTOM, { x: midX, y: maxY }, cursorMap.b, 'Bottom'))
        .add(new TransformHandle(HandleType.LEFT, { x: minX, y: midY }, cursorMap.l, 'Left'))
        .add(new TransformHandle(HandleType.RIGHT, { x: maxX, y: midY }, cursorMap.r, 'Right'))

        // Центр и поворот
        .add(new TransformHandle(HandleType.CENTER, { x: midX, y: midY }, cursorMap.center, 'Center'))
        .add(
            new TransformHandle(
                HandleType.ROTATE,
                { x: midX, y: minY - ROTATION_HANDLE_OFFSET },
                cursorMap.rotate,
                'Rotate'
            )
        );

    return handles;
}

/**
 * Создает handles для круга/эллипса.
 */
export function createCircleHandles(centerX: number, centerY: number, radiusX: number, radiusY: number): TransformHandles {
    const handles = new TransformHandles();

    const cursorMap = {
        r: 'ew-resize',
        b: 'ns-resize',
        rotate: 'crosshair',
        center: 'move',
    };

    handles
        .add(new TransformHandle(HandleType.RIGHT, { x: centerX + radiusX, y: centerY }, cursorMap.r, 'Radius X'))
        .add(new TransformHandle(HandleType.BOTTOM, { x: centerX, y: centerY + radiusY }, cursorMap.b, 'Radius Y'))
        .add(new TransformHandle(HandleType.CENTER, { x: centerX, y: centerY }, cursorMap.center, 'Center'))
        .add(
            new TransformHandle(
                HandleType.ROTATE,
                { x: centerX + radiusX, y: centerY - ROTATION_HANDLE_OFFSET },
                cursorMap.rotate,
                'Rotate'
            )
        );

    return handles;
}

// ---------- helper for transforming local handle definitions ----------
export function transformLocalHandles(
    defs: Array<{
        id: HandleType;
        local: Point;
        cursor?: string;
        label?: string;
    }>,
    matrix: import('@/canvas/utils/transform').AffineMatrix
): TransformHandles {
    const handles = new TransformHandles();
    for (const def of defs) {
        const pos = matrix.transformPoint(def.local);
        handles.add(
            new TransformHandle(def.id, pos, def.cursor ?? 'pointer', def.label ?? '')
        );
    }
    return handles;
}

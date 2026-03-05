import { Editable } from './property';
import { getEditableProperties } from './property';
import type { TransformHandles } from '@/canvas/utils/handles';
import { HandleType } from '@/canvas/utils/handles';
import { AffineMatrix } from '@/canvas/utils/transform';

export interface Point {
    x: number;
    y: number;
}

export interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

/**
 * Абстрактная фигура на холсте.
 */
export abstract class BaseShape {
    abstract readonly type: string;

    constructor(
        public id: string,
        public position: Point
    ) {}

    @Editable({ label: 'Позиция X', type: 'number' })
    get x(): number {
        return this.position.x;
    }
    set x(v: number) {
        this.position.x = v;
        this.markTransformDirty();
    }

    @Editable({ label: 'Позиция Y', type: 'number' })
    get y(): number {
        return this.position.y;
    }
    set y(v: number) {
        this.position.y = v;
        this.markTransformDirty();
    }

    // флаги/параметры трансформации. Используем приватные поля и аксессоры
    // чтобы автоматически инвалидировать кеш матрицы при изменении.

    private _rotation: number = 0;
    private _scaleX: number = 1;
    private _scaleY: number = 1;
    private _skewX: number = 0;
    private _skewY: number = 0;
    private _flipX: boolean = false;
    private _flipY: boolean = false;

    @Editable({ label: 'Поворот', type: 'number', min: 0, max: 360 })
    get rotation(): number {
        return this._rotation;
    }
    set rotation(v: number) {
        this._rotation = v;
        this.markTransformDirty();
    }

    @Editable({ label: 'Масштаб X', type: 'number', min: 0.1, max: 5, step: 0.1 })
    get scaleX(): number {
        return this._scaleX;
    }
    set scaleX(v: number) {
        this._scaleX = v;
        this.markTransformDirty();
    }

    @Editable({ label: 'Масштаб Y', type: 'number', min: 0.1, max: 5, step: 0.1 })
    get scaleY(): number {
        return this._scaleY;
    }
    set scaleY(v: number) {
        this._scaleY = v;
        this.markTransformDirty();
    }

    @Editable({ label: 'Сдвиг X', type: 'number', min: -1, max: 1, step: 0.1 })
    get skewX(): number {
        return this._skewX;
    }
    set skewX(v: number) {
        this._skewX = v;
        this.markTransformDirty();
    }

    @Editable({ label: 'Сдвиг Y', type: 'number', min: -1, max: 1, step: 0.1 })
    get skewY(): number {
        return this._skewY;
    }
    set skewY(v: number) {
        this._skewY = v;
        this.markTransformDirty();
    }

    @Editable({ label: 'Отражение по X', type: 'number' })
    get flipX(): boolean {
        return this._flipX;
    }
    set flipX(v: boolean) {
        this._flipX = v;
        this.markTransformDirty();
    }

    @Editable({ label: 'Отражение по Y', type: 'number' })
    get flipY(): boolean {
        return this._flipY;
    }
    set flipY(v: boolean) {
        this._flipY = v;
        this.markTransformDirty();
    }

    points?: Point[];

    /**
     * Проверка попадания точки с учётом всех преобразований фигуры.
     * Точка конвертируется в локальные координаты через обратную матрицу,
     * после чего вызывается hitTestLocal.
     */
    hitTest(point: Point): boolean {
        const inv = this.getTransformMatrix().invert();
        const local = inv.transformPoint(point);
        return this.hitTestLocal(local);
    }

    /**
     * Проверяет попадание точки в локальных координатах (без учёта трансформации).
     * Должен быть реализован в подклассе.
     */
    protected abstract hitTestLocal(point: Point): boolean;

    abstract getBoundingBox(): BoundingBox;

    /**
     * Template-method for rendering a shape.
     * Переопределяется в подклассах через реализацию drawShape().
     */
    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        this.getTransformMatrix().applyToCanvas(ctx);

        // общие стили (есть не у всех фигур)
        if ('fill' in this) ctx.fillStyle = (this as any).fill;
        if ('stroke' in this) ctx.strokeStyle = (this as any).stroke;
        if ('strokeWidth' in this) {
            const scale = Math.sqrt(Math.abs(this.scaleX * this.scaleY));
            ctx.lineWidth = (this as any).strokeWidth / scale;
        }

        this.drawShape(ctx);
        ctx.restore();
    }

    /**
     * Рисование конкретной формы. Реализуется в подклассах.
     */
    protected abstract drawShape(ctx: CanvasRenderingContext2D): void;

    abstract move(delta: Point): void;

    /**
     * Помечает кеш матрицы устаревшим. Вызывается при изменении
     * любого параметра, участвующего в преобразовании.
     */
    protected markTransformDirty(): void {
        this._cachedMatrix = null;
    }

    /**
     * Обрабатывает изменение фигуры при перетаскивании handle.
     * @param handle Тип маркера
     * @param localDelta Сдвиг в локальных координатах
     * @param globalDelta Сдвиг в глобальных (экранных) координатах
     * @param preserveAspect Сохранять ли пропорции (Shift)
     */
    abstract transformByHandle(
        handle: HandleType,
        localDelta: Point,
        globalDelta: Point,
        preserveAspect: boolean,
        /**
         * Дополнительные точки курсора при операции (глобальные).
         * Могут понадобиться специализированным фигурам (например, линия).
         */
        from?: Point,
        to?: Point
    ): void;

    /**
     * Получает трансформационные handles для фигуры.
     */
    abstract getTransformHandles(): TransformHandles;

    /**
     * Получает матрицу преобразования для фигуры.
     * Применяет в порядке: масштаб -> скос -> поворот -> трансляция
     */
    // кеш трансформационной матрицы, чтобы не пересчитывать её на каждом
    // вызове (нужно для быстрорисующих циклов).
    private _cachedMatrix: AffineMatrix | null = null;

    getTransformMatrix(): AffineMatrix {
        if (this._cachedMatrix) {
            return this._cachedMatrix;
        }

        // вычисляем заново и сохраняем
        const rotRad = (this.rotation * Math.PI) / 180;
        const scale = AffineMatrix.scale(
            this.scaleX * (this.flipX ? -1 : 1),
            this.scaleY * (this.flipY ? -1 : 1)
        );

        let skew = AffineMatrix.identity();
        if (this.skewX !== 0 || this.skewY !== 0) {
            skew = new AffineMatrix(1, Math.tan(this.skewY), Math.tan(this.skewX), 1, 0, 0);
        }

        const rotation = AffineMatrix.rotation(rotRad, 0, 0);
        const translation = AffineMatrix.translation(this.position.x, this.position.y);

        this._cachedMatrix = translation.multiply(rotation).multiply(skew).multiply(scale);
        return this._cachedMatrix;
    }

    /**
     * Стандартная реализация transformByHandle для фигур, которые
     * могут масштабироваться по углам/сторонам (rect, generic shapes).
     */
    protected defaultTransformByHandle(
        handle: HandleType,
        localDelta: Point,
        globalDelta: Point,
        preserveAspect: boolean,
        // from/to ignored by default implementation
        from?: Point,
        to?: Point
    ): void {
        const gdx = globalDelta.x;
        const gdy = globalDelta.y;

        switch (handle) {
            case HandleType.CENTER:
                this.move({ x: gdx, y: gdy });
                break;

            case HandleType.TOP_LEFT:
            case HandleType.TOP_RIGHT:
            case HandleType.BOTTOM_LEFT:
            case HandleType.BOTTOM_RIGHT:
                this.scaleFromCorner(handle, localDelta.x, localDelta.y, preserveAspect);
                break;

            case HandleType.TOP: {
                const bbox = this.getBoundingBox();
                const halfH = (bbox.maxY - bbox.minY) / 2 || 1;
                const syT = 1 - localDelta.y / halfH;
                this.scaleY = Math.max(0.1, this.scaleY * syT);
                break;
            }

            case HandleType.BOTTOM: {
                const bbox = this.getBoundingBox();
                const halfH = (bbox.maxY - bbox.minY) / 2 || 1;
                const syB = 1 + localDelta.y / halfH;
                this.scaleY = Math.max(0.1, this.scaleY * syB);
                break;
            }

            case HandleType.LEFT: {
                const bbox = this.getBoundingBox();
                const halfW = (bbox.maxX - bbox.minX) / 2 || 1;
                const sxL = 1 - localDelta.x / halfW;
                this.scaleX = Math.max(0.1, this.scaleX * sxL);
                break;
            }

            case HandleType.RIGHT: {
                const bbox = this.getBoundingBox();
                const halfW = (bbox.maxX - bbox.minX) / 2 || 1;
                const sxR = 1 + localDelta.x / halfW;
                this.scaleX = Math.max(0.1, this.scaleX * sxR);
                break;
            }
        }
    }

    /**
     * Вспомогательный метод для масштабирования по углу с учётом
     * сохранения пропорций.
     */
    protected scaleFromCorner(
        handle: HandleType,
        ldx: number,
        ldy: number,
        preserveAspect: boolean = false
    ): void {
        let w = (this.getBoundingBox().maxX - this.getBoundingBox().minX) || 1;
        let h = (this.getBoundingBox().maxY - this.getBoundingBox().minY) || 1;
        const halfW = w / 2;
        const halfH = h / 2;

        const isLeft = handle === HandleType.TOP_LEFT || handle === HandleType.BOTTOM_LEFT;
        const isTop = handle === HandleType.TOP_LEFT || handle === HandleType.TOP_RIGHT;

        let sx = 1 + (isLeft ? -ldx : ldx) / halfW;
        let sy = 1 + (isTop ? -ldy : ldy) / halfH;

        if (preserveAspect) {
            const avg = (sx + sy) / 2;
            sx = avg;
            sy = avg;
        }

        this.scaleX = Math.max(0.1, this.scaleX * sx);
        this.scaleY = Math.max(0.1, this.scaleY * sy);
    }

    /**
     * Масштабирует фигуру.
     */
    scale(sx: number, sy?: number): void {
        const sy_ = sy ?? sx;
        this.scaleX *= sx;
        this.scaleY *= sy_;
        this.markTransformDirty();
    }

    /**
     * Поворачивает фигуру на угол в градусах.
     */
    rotate(angleDeg: number): void {
        this.rotation = (this.rotation + angleDeg) % 360;
        // mark dirty done by setter
    }

    /**
     * Добавляет отражение по оси X.
     */
    reflectX(): void {
        this.flipX = !this.flipX;
    }

    /**
     * Добавляет отражение по оси Y.
     */
    reflectY(): void {
        this.flipY = !this.flipY;
    }

    /**
     * Добавляет сдвиг (скос).
     */
    skew(skewX: number, skewY: number = 0): void {
        this.skewX += skewX;
        this.skewY += skewY;
    }

    /**
     * Получает список редактируемых свойств для панели управления.
     */
    getProperties() {
        return getEditableProperties(this);
    }

    /**
     * Утилита для преобразования набора локальных точек в глобальные.
     */
    protected transformLocalPoints(points: Point[]): Point[] {
        const m = this.getTransformMatrix();
        return points.map(p => m.transformPoint(p));
    }

    /**
     * Полезный помощник для получения axis-aligned bounding box
     * из набора локальных точек.
     */
    protected computeBoundingBoxFromLocal(points: Point[]): BoundingBox {
        const transformed = this.transformLocalPoints(points);
        const xs = transformed.map(p => p.x);
        const ys = transformed.map(p => p.y);
        return {
            minX: Math.min(...xs),
            minY: Math.min(...ys),
            maxX: Math.max(...xs),
            maxY: Math.max(...ys),
        };
    }
}

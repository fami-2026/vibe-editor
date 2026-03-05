/**
 * Утилиты для аффинных преобразований.
 * Поддерживает: масштабирование, поворот, сдвиг, отражение.
 */

export interface Point {
    x: number;
    y: number;
}

/**
 * Матрица 3x3 для аффинных преобразований.
 * [a c e]   [x']   [a*x + c*y + e]
 * [b d f] * [y] = [b*x + d*y + f]
 * [0 0 1]   [1]   [           1]
 */
export class AffineMatrix {
    constructor(
        public a: number = 1,
        public b: number = 0,
        public c: number = 0,
        public d: number = 1,
        public e: number = 0,
        public f: number = 0
    ) {}

    /**
     * Создает идентичную матрицу.
     */
    static identity(): AffineMatrix {
        return new AffineMatrix(1, 0, 0, 1, 0, 0);
    }

    /**
     * Создает матрицу трансляции (сдвига).
     */
    static translation(tx: number, ty: number): AffineMatrix {
        return new AffineMatrix(1, 0, 0, 1, tx, ty);
    }

    /**
     * Создает матрицу масштабирования.
     */
    static scale(sx: number, sy: number = sx): AffineMatrix {
        return new AffineMatrix(sx, 0, 0, sy, 0, 0);
    }

    /**
     * Создает матрицу поворота в радианах.
     */
    static rotation(angle: number, centerX: number = 0, centerY: number = 0): AffineMatrix {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Поворот вокруг центра: translate(center) -> rotate -> translate(-center)
        const m1 = AffineMatrix.translation(centerX, centerY);
        const m2 = new AffineMatrix(cos, sin, -sin, cos, 0, 0);
        const m3 = AffineMatrix.translation(-centerX, -centerY);

        return m3.multiply(m2).multiply(m1);
    }

    /**
     * Создает матрицу отражения по оси X.
     */
    static reflectX(axisY: number = 0): AffineMatrix {
        return new AffineMatrix(1, 0, 0, -1, 0, 2 * axisY);
    }

    /**
     * Создает матрицу отражения по оси Y.
     */
    static reflectY(axisX: number = 0): AffineMatrix {
        return new AffineMatrix(-1, 0, 0, 1, 2 * axisX, 0);
    }

    /**
     * Создает матрицу сдвига (скоса).
     */
    static skew(skewX: number, skewY: number = 0): AffineMatrix {
        return new AffineMatrix(1, Math.tan(skewY), Math.tan(skewX), 1, 0, 0);
    }

    /**
     * Умножает две матрицы.
     */
    multiply(other: AffineMatrix): AffineMatrix {
        const a = this.a * other.a + this.c * other.b;
        const b = this.b * other.a + this.d * other.b;
        const c = this.a * other.c + this.c * other.d;
        const d = this.b * other.c + this.d * other.d;
        const e = this.a * other.e + this.c * other.f + this.e;
        const f = this.b * other.e + this.d * other.f + this.f;

        return new AffineMatrix(a, b, c, d, e, f);
    }

    /**
     * Применяет преобразование к точке.
     */
    transformPoint(point: Point): Point {
        return {
            x: this.a * point.x + this.c * point.y + this.e,
            y: this.b * point.x + this.d * point.y + this.f,
        };
    }

    /**
     * Применяет преобразование к вектору (без трансляции).
     */
    transformVector(vec: Point): Point {
        return {
            x: this.a * vec.x + this.c * vec.y,
            y: this.b * vec.x + this.d * vec.y,
        };
    }

    /**
     * Инвертирует матрицу.
     */
    invert(): AffineMatrix {
        const det = this.a * this.d - this.c * this.b;
        if (Math.abs(det) < 1e-10) {
            console.warn('Matrix is singular, cannot invert');
            return AffineMatrix.identity();
        }

        const invDet = 1 / det;
        const a = this.d * invDet;
        const b = -this.b * invDet;
        const c = -this.c * invDet;
        const d = this.a * invDet;
        const e = (this.c * this.f - this.d * this.e) * invDet;
        const f = (this.b * this.e - this.a * this.f) * invDet;

        return new AffineMatrix(a, b, c, d, e, f);
    }

    /**
     * Применяет матрицу к контексту канваса.
     */
    applyToCanvas(ctx: CanvasRenderingContext2D): void {
        ctx.transform(this.a, this.b, this.c, this.d, this.e, this.f);
    }

    /**
     * Клонирует матрицу.
     */
    clone(): AffineMatrix {
        return new AffineMatrix(this.a, this.b, this.c, this.d, this.e, this.f);
    }

    /**
     * Преобразует матрицу в строку для отладки.
     */
    toString(): string {
        return `[${this.a.toFixed(2)} ${this.c.toFixed(2)} ${this.e.toFixed(2)}]\n[${this.b.toFixed(2)} ${this.d.toFixed(2)} ${this.f.toFixed(2)}]\n[0 0 1]`;
    }
}

/**
 * Утилиты для работы с преобразованиями.
 */
export class TransformUtils {
    /**
     * Вычисляет расстояние между двумя точками.
     */
    static distance(p1: Point, p2: Point): number {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Вычисляет угол между двумя точками в радианах.
     */
    static angle(p1: Point, p2: Point): number {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }

    /**
     * Вычисляет угол между двумя точками в градусах.
     */
    static angleDeg(p1: Point, p2: Point): number {
        return (this.angle(p1, p2) * 180) / Math.PI;
    }

    /**
     * Вычисляет точку на линии на расстоянии от начала.
     */
    static pointAtDistance(start: Point, angle: number, distance: number): Point {
        return {
            x: start.x + Math.cos(angle) * distance,
            y: start.y + Math.sin(angle) * distance,
        };
    }

    /**
     * Проверяет, находится ли точка в круге.
     */
    static pointInCircle(point: Point, center: Point, radius: number): boolean {
        const dist = this.distance(point, center);
        return dist <= radius;
    }

    /**
     * Поворачивает точку вокруг центра на угол в радианах.
     */
    static rotatePoint(point: Point, center: Point, angle: number): Point {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = point.x - center.x;
        const dy = point.y - center.y;

        return {
            x: center.x + dx * cos - dy * sin,
            y: center.y + dx * sin + dy * cos,
        };
    }

    /**
     * Масштабирует точку относительно центра.
     */
    static scalePoint(point: Point, center: Point, scaleX: number, scaleY: number = scaleX): Point {
        return {
            x: center.x + (point.x - center.x) * scaleX,
            y: center.y + (point.y - center.y) * scaleY,
        };
    }

    /**
     * Отражает точку по вертикали относительно оси.
     */
    static reflectPointX(point: Point, axisY: number): Point {
        return {
            x: point.x,
            y: 2 * axisY - point.y,
        };
    }

    /**
     * Отражает точку по горизонтали относительно оси.
     */
    static reflectPointY(point: Point, axisX: number): Point {
        return {
            x: 2 * axisX - point.x,
            y: point.y,
        };
    }
}

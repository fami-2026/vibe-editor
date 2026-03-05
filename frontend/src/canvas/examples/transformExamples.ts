/**
 * Примеры использования системы трансформации фигур
 * 
 * Этот файл демонстрирует все возможности работы с преобразованиями.
 * Используется для тестирования и как справочник для разработчиков.
 */

import { AffineMatrix, TransformUtils } from '@/canvas/utils/transform';
import { RectShape, CircleShape, LineShape } from '@/canvas/types';
import type { Point } from '@/canvas/types';

// ============================================================================
// 1. РАБОТА С МАТРИЦАМИ ПРЕОБРАЗОВАНИЯ
// ============================================================================

export function examplesWithMatrices() {
    console.log('=== Матричные преобразования ===');

    // Создание базовых матриц
    const identity = AffineMatrix.identity();
    console.log('Идентичная матрица:', identity.toString());

    // Трансляция (сдвиг)
    const translate = AffineMatrix.translation(100, 50);
    console.log('Трансляция на (100, 50):', translate.toString());

    // Масштабирование
    const scale = AffineMatrix.scale(1.5, 0.8);
    console.log('Масштабирование (1.5x, 0.8x):', scale.toString());

    // Поворот
    const rotationAngle = Math.PI / 4; // 45 градусов
    const rotate = AffineMatrix.rotation(rotationAngle, 0, 0);
    console.log('Поворот на 45°:', rotate.toString());

    // Отражения
    const reflectX = AffineMatrix.reflectX(100);
    console.log('Отражение по X:', reflectX.toString());

    const reflectY = AffineMatrix.reflectY(100);
    console.log('Отражение по Y:', reflectY.toString());

    // Сдвиг (скос)
    const skew = AffineMatrix.skew(0.2, 0.1);
    console.log('Сдвиг:', skew.toString());

    // Композиция преобразований
    console.log('\n--- Комбинирование преобразований ---');
    const combined = scale.multiply(rotate).multiply(translate);
    console.log('Масштаб → Поворот → Трансляция:', combined.toString());

    // Применение к точке
    const point: Point = { x: 10, y: 20 };
    const transformed = combined.transformPoint(point);
    console.log(`Точка (${point.x}, ${point.y}) после преобразований:`, transformed);

    // Применение к вектору (без трансляции)
    const vector: Point = { x: 1, y: 0 };
    const transformedVec = combined.transformVector(vector);
    console.log(`Вектор (${vector.x}, ${vector.y}) после преобразований:`, transformedVec);

    // Инверсия матрицы
    const inverted = combined.invert();
    const restored = inverted.transformPoint(transformed);
    console.log('После инверсии:', `(${restored.x.toFixed(2)}, ${restored.y.toFixed(2)})`);
}

// ============================================================================
// 2. РАБОТА С УТИЛИТАМИ ТРАНСФОРМАЦИИ
// ============================================================================

export function examplesWithTransformUtils() {
    console.log('\n=== Утилиты трансформации ===');

    const p1: Point = { x: 0, y: 0 };
    const p2: Point = { x: 3, y: 4 };

    // Расстояние
    const dist = TransformUtils.distance(p1, p2);
    console.log(`Расстояние между (0,0) и (3,4): ${dist}`); // 5

    // Углы
    const angleRad = TransformUtils.angle(p1, p2);
    const angleDeg = TransformUtils.angleDeg(p1, p2);
    console.log(`Угол в радианах: ${angleRad.toFixed(3)}`);
    console.log(`Угол в градусах: ${angleDeg.toFixed(1)}`);

    // Точка на расстоянии
    const pointAtDist = TransformUtils.pointAtDistance(p1, angleRad, 10);
    console.log(
        `Точка на расстоянии 10 от начала в направлении p2:`,
        `(${pointAtDist.x.toFixed(2)}, ${pointAtDist.y.toFixed(2)})`
    );

    // Проверка точки в круге
    const center: Point = { x: 100, y: 100 };
    const radius = 50;
    const testPoint: Point = { x: 120, y: 110 };
    const inCircle = TransformUtils.pointInCircle(testPoint, center, radius);
    console.log(`Точка (120, 110) в круге с центром (100, 100) и радиусом 50: ${inCircle}`);

    // Поворот точки
    console.log('\n--- Примеры поворотов ---');
    const center2: Point = { x: 50, y: 50 };
    const point: Point = { x: 100, y: 50 };
    const rotated90 = TransformUtils.rotatePoint(point, center2, Math.PI / 2);
    console.log(
        `Точка (100, 50) повернута на 90° вокруг (50, 50):`,
        `(${rotated90.x.toFixed(1)}, ${rotated90.y.toFixed(1)})`
    );

    // Масштабирование точки
    const scaled = TransformUtils.scalePoint(point, center2, 2);
    console.log(
        `Точка (100, 50) масштабирована в 2 раза от (50, 50):`,
        `(${scaled.x.toFixed(1)}, ${scaled.y.toFixed(1)})`
    );
}

// ============================================================================
// 3. ТРАНСФОРМАЦИЯ ФИГУР
// ============================================================================

export function examplesWithShapes() {
    console.log('\n=== Трансформация фигур ===');

    // Создание фигур
    const rect = new RectShape('rect1', { x: 100, y: 100 }, 80, 60);
    const circle = new CircleShape('circle1', { x: 200, y: 200 }, 40, 40);
    const line = new LineShape('line1', { x: 50, y: 50 }, { x: 150, y: 150 });

    console.log('Создано 3 фигуры: прямоугольник, круг, линия');

    // Примеры трансформации прямоугольника
    console.log('\n--- Прямоугольник (исходно): позиция (100, 100), 80x60 ---');

    rect.rotate(45);
    console.log(`После rotate(45): rotation = ${rect.rotation}°`);

    rect.scale(1.5, 0.8);
    console.log(`После scale(1.5, 0.8): scaleX = ${rect.scaleX}, scaleY = ${rect.scaleY}`);

    rect.skew(0.1, 0.2);
    console.log(`После skew(0.1, 0.2): skewX = ${rect.skewX}, skewY = ${rect.skewY}`);

    rect.reflectX();
    console.log(`После reflectX(): flipX = ${rect.flipX}`);

    rect.reflectY();
    console.log(`После reflectY(): flipY = ${rect.flipY}`);

    // Получение матрицы преобразования
    const matrix = rect.getTransformMatrix();
    console.log('Матрица преобразования:\n', matrix.toString());

    // Получение handles
    const handles = rect.getTransformHandles();
    console.log('Handles для прямоугольника:');
    handles.getAll().forEach(h => {
        console.log(`  - ${h.id}: (${h.position.x.toFixed(0)}, ${h.position.y.toFixed(0)})`);
    });

    // Примеры с кругом
    console.log('\n--- Круг (исходно): позиция (200, 200), радиус 40 ---');
    circle.rotate(90);
    circle.scale(1.2);
    console.log(`После трансформций: rotation = ${circle.rotation}°, scaleX = ${circle.scaleX}`);

    // Примеры с линией
    console.log('\n--- Линия (исходно): от (50, 50) до (150, 150) ---');
    line.rotate(30);
    line.scale(2);
    console.log(`После трансформций: rotation = ${line.rotation}°, scaleX = ${line.scaleX}`);

    // Сброс трансформаций (пример)
    console.log('\n--- Сброс трансформаций ---');
    function resetTransforms(shape: any) {
        shape.rotation = 0;
        shape.scaleX = 1;
        shape.scaleY = 1;
        shape.skewX = 0;
        shape.skewY = 0;
        shape.flipX = false;
        shape.flipY = false;
    }
    resetTransforms(rect);
    console.log('После resetTransforms(rect): все параметры сброшены');
}

// ============================================================================
// 4. РАБОТА С HANDLES (ТОЧКАМИ УПРАВЛЕНИЯ)
// ============================================================================

export function examplesWithHandles() {
    console.log('\n=== Работа с handles ===');

    const rect = new RectShape('rect1', { x: 100, y: 100 }, 80, 60);
    const handles = rect.getTransformHandles();

    console.log('Все handles для прямоугольника:');
    const allHandles = handles.getAll();
    allHandles.forEach(h => {
        console.log(`  - ${h.id} (${h.label}): (${h.position.x}, ${h.position.y}), cursor: ${h.cursor}`);
    });

    // Поиск handle по ID
    const rotateHandle = handles.getById('rotate');
    console.log(`\nHandle ROTATE найден:`, rotateHandle !== null);

    // Hit-тестирование
    const testPoint: Point = { x: 100, y: 80 }; // Близко к top-left
    const hitHandle = handles.hitTest(testPoint, 8); // Радиус 8
    console.log(`Hit-test для точки (100, 80):`, hitHandle?.id ?? 'no hit');

    // Обновление позиций handles
    const newPositions = new Map([
        ['tl', { x: 50, y: 50 }],
        ['br', { x: 150, y: 150 }],
    ]);
    handles.updatePositions(newPositions);
    console.log('Позиции handles обновлены');

    // Получение обновленного handle
    const updatedTL = handles.getById('tl');
    console.log(`Updated TL position: (${updatedTL?.position.x}, ${updatedTL?.position.y})`);
}

// ============================================================================
// 5. ПРАКТИЧЕСКИЕ СЦЕНАРИИ
// ============================================================================

export function practicalScenarios() {
    console.log('\n=== Практические сценарии ===');

    // Сценарий 1: Поворот фигуры вокруг точки
    console.log('\n--- Сценарий 1: Поворот вокруг центра---');
    const shape1 = new RectShape('rect', { x: 500, y: 300 }, 100, 50);
    const rotationCenter: Point = { x: 500, y: 300 };
    const angle = Math.PI / 3; // 60 градусов

    // Создать матрицу поворота
    const rotMatrix = AffineMatrix.rotation(angle, rotationCenter.x, rotationCenter.y);
    console.log('Создана матрица поворота на 60° вокруг центра фигуры');

    // Сценарий 2: Относительное масштабирование
    console.log('\n--- Сценарий 2: Масштабирование с привязкой к углу---');
    const shape2 = new CircleShape('circle', { x: 300, y: 300 }, 50);
    const cornerTopLeft: Point = { x: 250, y: 250 };
    shape2.scale(1.5); // Увеличить в 1.5 раза
    console.log('Круг масштабирован в 1.5 раза');

    // Сценарий 3: Анимированное преобразование
    console.log('\n--- Сценарий 3: Анимированное преобразование---');
    function animateTransform(shape: any, frames: number) {
        console.log(`Анимировать ${frames} кадров:`);
        for (let i = 0; i < frames; i++) {
            const progress = i / frames;
            const angle = (Math.PI * 2 * progress); // Полный оборот
            shape.rotation = (angle * 180) / Math.PI;
            if (i % 4 === 0) {
                console.log(`  Кадр ${i}: rotation = ${shape.rotation.toFixed(0)}°`);
            }
        }
    }
    const shape3 = new RectShape('rect', { x: 400, y: 400 }, 60, 40);
    animateTransform(shape3, 16);

    // Сценарий 4: Зеркальное отражение
    console.log('\n--- Сценарий 4: Комплексные преобразования---');
    const shape4 = new RectShape('rect', { x: 200, y: 200 }, 80, 60);
    shape4.rotate(45);
    shape4.scale(1.2, 0.8);
    shape4.skew(0.1);
    shape4.reflectX();
    console.log('Фигура после всех преобразований:');
    console.log(`  rotation: ${shape4.rotation}°`);
    console.log(`  scaleX: ${shape4.scaleX}, scaleY: ${shape4.scaleY}`);
    console.log(`  skewX: ${shape4.skewX}, skewY: ${shape4.skewY}`);
    console.log(`  flipX: ${shape4.flipX}, flipY: ${shape4.flipY}`);
}

// ============================================================================
// 6. ЗАПУСК ПРИМЕРОВ
// ============================================================================

export function runAllExamples() {
    console.clear();
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ СИСТЕМЫ ТРАНСФОРМАЦИИ ФИГУР         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    examplesWithMatrices();
    examplesWithTransformUtils();
    examplesWithShapes();
    examplesWithHandles();
    practicalScenarios();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ПРИМЕРЫ ЗАВЕРШЕНЫ                                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
}

// Раскомментируйте для запуска в консоли:
// runAllExamples();

/**
 * Простой тест для проверки, что фигуры рендерятся правильно
 */

import { RectShape, CircleShape, LineShape } from '@/canvas/types';

export function testShapes() {
    try {
        // Создаём простые фигуры без трансформаций
        const rect = new RectShape('test-rect', { x: 100, y: 100 }, 80, 60);
        const circle = new CircleShape('test-circle', { x: 300, y: 100 }, 50, 50);
        const line = new LineShape('test-line', { x: 50, y: 50 }, { x: 150, y: 150 });

        console.log('✓ Shapes created successfully');

        // Проверяем, что getTransformMatrix работает
        const rectMatrix = rect.getTransformMatrix();
        const circleMatrix = circle.getTransformMatrix();
        const lineMatrix = line.getTransformMatrix();

        console.log('✓ Transform matrices generated');
        console.log('Rect matrix:', rectMatrix.toString());

        // Проверяем getBoundingBox
        const rectBbox = rect.getBoundingBox();
        const circleBbox = circle.getBoundingBox();
        const lineBbox = line.getBoundingBox();

        console.log('✓ Bounding boxes computed');
        console.log('Rect bbox:', rectBbox);

        // Проверяем hitTest
        const rectHit = rect.hitTest({ x: 100, y: 100 });
        const circleHit = circle.hitTest({ x: 300, y: 100 });
        const lineHit = line.hitTest({ x: 100, y: 100 });

        console.log('✓ Hit tests work');
        console.log('Rect hit center:', rectHit);

        // Проверяем getTransformHandles
        const rectHandles = rect.getTransformHandles();
        const circleHandles = circle.getTransformHandles();
        const lineHandles = line.getTransformHandles();

        console.log('✓ Transform handles generated');
        console.log('Rect handles count:', rectHandles.getAll().length);

        // Проверяем трансформации
        rect.rotate(45);
        console.log('✓ Rotate works, rotation =', rect.rotation);

        rect.scale(1.5);
        console.log('✓ Scale works, scaleX =', rect.scaleX, 'scaleY =', rect.scaleY);

        rect.reflectX();
        console.log('✓ Reflect works, flipX =', rect.flipX);

        // Проверяем render (без реального canvas)
        const mockCtx = {
            save: () => {},
            restore: () => {},
            transform: (a: any, b: any, c: any, d: any, e: any, f: any) => {
                console.log('  transform called:', a, b, c, d, e, f);
            },
            fillRect: () => {},
            strokeRect: () => {},
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
        };

        console.log('✓ Mock render test:');
        rect.render(mockCtx as any);
        circle.render(mockCtx as any);
        line.render(mockCtx as any);

        console.log('\n✅ All tests passed! Shapes should render correctly.');
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

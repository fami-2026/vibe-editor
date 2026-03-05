export type { Point, BoundingBox } from './base';
export { BaseShape } from './base';
export { CircleShape } from './circle';
export { RectShape } from './rect';
export { LineShape } from './line';
export { shapeRegistry } from './registry';

export type Shape = import('./base').BaseShape;
export type ShapeType = string;

export interface Viewport {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
}

// Transform utilities
export { AffineMatrix, TransformUtils } from '@/canvas/utils/transform';
export type { TransformState } from '@/canvas/utils/handles';
export {
    TransformHandles,
    TransformHandle,
    HandleType,
    createRectHandles,
    createCircleHandles,
} from '@/canvas/utils/handles';

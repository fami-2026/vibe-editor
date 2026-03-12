<template>
    <aside class="panel" aria-label="Inspector">
        <!-- Позиция и размеры -->
        <section class="group">
            <h3 class="groupTitle">Позиция и размеры</h3>

            <!-- Расположение: 2 поля -->
            <div class="fieldBlock">
                <div class="fieldLabel">Расположение</div>
                <div class="grid2">
                    <input
                        class="fieldInput"
                        type="number"
                        aria-label="X"
                        :value="selectedShape?.x ?? ''"
                        :disabled="!selectedShape"
                        @input="onNumberChange('x', $event)"
                    />
                    <input
                        class="fieldInput"
                        type="number"
                        aria-label="Y"
                        :value="selectedShape?.y ?? ''"
                        :disabled="!selectedShape"
                        @input="onNumberChange('y', $event)"
                    />
                </div>
            </div>

            <!-- Размер: 2 поля (для всех фигур, кроме line) -->
            <!-- Размер: 2 поля (для всех фигур, кроме line) -->
            <div v-if="selectedShape?.type !== 'line'" class="fieldBlock">
                <div class="fieldBlock">
                    <div class="fieldLabel">Размер</div>
                    <div class="grid2">
                        <input
                            class="fieldInput"
                            type="number"
                            aria-label="Width"
                            :value="shapeWidth"
                            :disabled="!selectedShape"
                            min="1"
                            @input="onNumberChange('width', $event)"
                        />
                        <input
                            class="fieldInput"
                            type="number"
                            aria-label="Height"
                            :value="shapeHeight"
                            :disabled="!selectedShape"
                            min="1"
                            @input="onNumberChange('height', $event)"
                        />
                    </div>
                </div>
            </div>
        </section>

        <!-- Отражение -->
        <div class="fieldBlock">
            <div class="fieldLabel">Масштаб</div>
            <div class="grid2">
                <input
                    class="fieldInput"
                    type="number"
                    aria-label="Scale X"
                    :value="selectedShape?.scaleX ?? ''"
                    :disabled="!selectedShape"
                    min="-10"
                    max="10"
                    step="0.1"
                    @input="onNumberChange('scaleX', $event)"
                />
                <input
                    class="fieldInput"
                    type="number"
                    aria-label="Scale Y"
                    :value="selectedShape?.scaleY ?? ''"
                    :disabled="!selectedShape"
                    min="-10"
                    max="10"
                    step="0.1"
                    @input="onNumberChange('scaleY', $event)"
                />
            </div>
            <div class="fieldLabel">Отражение</div>
            <div class="grid2">
                <button
                    class="iconBtnSmall"
                    :disabled="!selectedShape"
                    @click="onFlip('scaleX')"
                    title="Отразить по горизонтали"
                >
                    <span style="transform: scaleX(-1)">⇄</span>
                </button>
                <button
                    class="iconBtnSmall"
                    :disabled="!selectedShape"
                    @click="onFlip('scaleY')"
                    title="Отразить по вертикали"
                >
                    <span style="transform: rotate(90deg) scaleX(-1)">⇄</span>
                </button>
            </div>
        </div>

        <!-- Поворот (для всех фигур, кроме line) -->
        <div v-if="selectedShape?.type !== 'line'" class="fieldBlock">
            <div class="fieldBlock">
                <div class="fieldLabel">Поворот</div>
                <div class="grid2">
                    <input
                        class="fieldInput"
                        type="number"
                        aria-label="Rotation"
                        :value="selectedShape?.rotation ?? ''"
                        :disabled="!selectedShape"
                        min="0"
                        max="360"
                        step="1"
                        @input="onNumberChange('rotation', $event)"
                    />
                    <div class="spacer" aria-hidden="true" />
                </div>
            </div>
        </div>

        <div class="divider" />

        <!-- Фигура (только для фигур с заливкой) -->
        <section v-if="hasFill" class="group">
            <h3 class="groupTitle">Фигура</h3>

            <div class="grid2Blocks">
                <div class="fieldBlock">
                    <div class="fieldLabel">Цвет заливки</div>
                    <div class="grid1">
                        <input
                            class="colorInput"
                            type="color"
                            aria-label="Fill color"
                            :value="fillColor"
                            :disabled="!selectedShape"
                            @input="onColorChange('fill', $event)"
                        />
                    </div>
                </div>

                <div class="fieldBlock">
                    <div class="fieldLabel">Прозрачность</div>
                    <div class="grid1">
                        <input
                            class="fieldInput"
                            type="range"
                            aria-label="Fill opacity"
                            min="0"
                            max="1"
                            step="0.05"
                            :value="fillOpacity"
                            :disabled="!selectedShape"
                            @input="onOpacityChange('fillOpacity', $event)"
                        />
                    </div>
                </div>
            </div>
        </section>

        <!-- Специальные свойства для кривой -->
        <section v-if="selectedShape?.type === 'curve'" class="group">
            <h3 class="groupTitle">Кривая</h3>
            <div class="fieldBlock">
                <div class="fieldLabel">Количество точек</div>
                <div class="grid2">
                    <input
                        class="fieldInput"
                        type="number"
                        :value="curvePointsCount"
                        disabled
                        readonly
                    />
                    <div class="spacer" aria-hidden="true" />
                </div>
            </div>
        </section>

        <div class="divider" />

        <!-- Обводка (для всех фигур) -->
        <section class="group">
            <h3 class="groupTitle">Обводка</h3>

            <div class="grid2Blocks">
                <div class="fieldBlock">
                    <div class="fieldLabel">Цвет</div>
                    <div class="grid1">
                        <input
                            class="colorInput"
                            type="color"
                            aria-label="Stroke color"
                            :value="strokeColor"
                            :disabled="!selectedShape"
                            @input="onColorChange('stroke', $event)"
                        />
                    </div>
                </div>

                <div class="fieldBlock">
                    <div class="fieldLabel">Прозрачность</div>
                    <div class="grid1">
                        <input
                            class="fieldInput"
                            type="range"
                            aria-label="Stroke opacity"
                            min="0"
                            max="1"
                            step="0.05"
                            :value="strokeOpacity"
                            :disabled="!selectedShape"
                            @input="onOpacityChange('strokeOpacity', $event)"
                        />
                    </div>
                </div>
            </div>

            <div class="fieldBlock">
                <div class="fieldLabel">Толщина</div>
                <div class="grid2">
                    <input
                        class="fieldInput"
                        type="number"
                        aria-label="Stroke width"
                        :value="strokeWidth"
                        :disabled="!selectedShape"
                        min="0"
                        step="0.5"
                        @input="onNumberChange('strokeWidth', $event)"
                    />
                    <div class="spacer" aria-hidden="true" />
                </div>
            </div>
        </section>

        <div class="divider" />

        <!-- Слои -->
        <section class="group">
            <div class="layersHeader">
                <h3 class="groupTitle">Слои</h3>
                <div class="layerControls">
                    <button
                        class="iconBtnSmall"
                        @click="moveLayerUp"
                        :disabled="!selectedShape || !canMoveUp"
                        :title="'Переместить вверх'"
                        aria-label="Переместить слой вверх"
                    >
                        <span aria-hidden="true">↑</span>
                    </button>
                    <button
                        class="iconBtnSmall"
                        @click="moveLayerDown"
                        :disabled="!selectedShape || !canMoveDown"
                        :title="'Переместить вниз'"
                        aria-label="Переместить слой вниз"
                    >
                        <span aria-hidden="true">↓</span>
                    </button>
                </div>
            </div>

            <ul class="layersList" role="listbox" aria-label="Layers">
                <li
                    v-for="(shape, index) in layers"
                    :key="shape.id"
                    draggable="true"
                    @dragstart="onLayerDragStart(index, $event)"
                    @dragover.prevent
                    @drop="onLayerDrop(index, $event)"
                >
                    <div
                        class="layerItem"
                        :class="{ isActive: shape.id === selectedShape?.id }"
                        @click="onSelectLayer(shape.id)"
                    >
                        <span class="thumb" aria-hidden="true">
                            <svg class="thumbSvg" viewBox="0 0 20 20">
                                <!-- Прямоугольник -->
                                <rect
                                    v-if="shape.type === 'rect'"
                                    x="2"
                                    y="4"
                                    width="16"
                                    height="12"
                                    rx="1"
                                    :fill="thumbFill(shape)"
                                    :fill-opacity="thumbFillOpacity(shape)"
                                    :stroke="thumbStroke(shape)"
                                    stroke-width="1.5"
                                />
                                <!-- Круг / эллипс -->
                                <ellipse
                                    v-else-if="shape.type === 'circle'"
                                    cx="10"
                                    cy="10"
                                    rx="8"
                                    ry="7"
                                    :fill="thumbFill(shape)"
                                    :fill-opacity="thumbFillOpacity(shape)"
                                    :stroke="thumbStroke(shape)"
                                    stroke-width="1.5"
                                />
                                <!-- Линия -->
                                <line
                                    v-else-if="shape.type === 'line'"
                                    x1="3"
                                    y1="17"
                                    x2="17"
                                    y2="3"
                                    :stroke="thumbStroke(shape)"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                />
                                <!-- Все остальные полигональные фигуры -->
                                <polygon
                                    v-else
                                    :points="getThumbPoints(shape)"
                                    :fill="thumbFill(shape)"
                                    :fill-opacity="thumbFillOpacity(shape)"
                                    :stroke="thumbStroke(shape)"
                                    stroke-width="1.5"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </span>

                        <!-- Режим редактирования -->
                        <input
                            v-if="editingLayerId === shape.id"
                            :ref="
                                (el) =>
                                    setInputRef(
                                        el as HTMLInputElement | null,
                                        shape.id
                                    )
                            "
                            class="layerNameInput"
                            type="text"
                            :value="
                                (shape as any).name || shapeLabel(shape.type)
                            "
                            @click.stop
                            @dblclick.stop
                            @blur="onLayerNameBlur(shape.id, $event)"
                            @keyup.enter="onLayerNameEnter(shape.id, $event)"
                            @keyup.escape="cancelEditing"
                        />

                        <!-- Обычный режим -->
                        <span
                            v-else
                            class="layerName"
                            @dblclick.stop="startEditing(shape.id)"
                        >
                            {{ (shape as any).name || shapeLabel(shape.type) }}
                        </span>
                    </div>
                </li>
            </ul>
        </section>
    </aside>
</template>

<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useCanvasStore } from '@/stores/canvas';
import type { Shape } from '@/canvas/types';
import type { CurveShape } from '@/canvas/types/curve/curve';
const canvasStore = useCanvasStore();
const { selectedShape, shapes } = storeToRefs(canvasStore);

const editingLayerId = ref<string | null>(null);
const inputRefs = ref<Record<string, HTMLInputElement>>({});

const setInputRef = (el: HTMLInputElement | null, shapeId: string) => {
    if (el) {
        inputRefs.value[shapeId] = el;
    }
};

watch(
    () => shapes.value.length,
    (newLength, oldLength) => {
        if (newLength > oldLength) {
            const newShape = shapes.value[shapes.value.length - 1];
            if (newShape) {
                setTimeout(() => {
                    startEditing(newShape.id);
                }, 100);
            }
        }
    }
);

function getShapeNumberProp(key: string, fallback: number | '') {
    if (!selectedShape.value) return fallback;
    const value = (selectedShape.value as unknown as Record<string, unknown>)[
        key
    ];
    return typeof value === 'number' ? value : fallback;
}

function getShapeStringProp(key: string, fallback: string) {
    if (!selectedShape.value) return fallback;
    const value = (selectedShape.value as unknown as Record<string, unknown>)[
        key
    ];
    return typeof value === 'string' ? value : fallback;
}

const hasFill = computed(() => {
    if (!selectedShape.value) return false;
    const type = selectedShape.value.type;
    return ['rect', 'circle', 'triangle', 'polygon', 'star', 'hexagon', 'arrow'].includes(type);
});

const shapeWidth = computed(() => {
    if (!selectedShape.value) return '';
    const type = selectedShape.value.type;
    if (type === 'curve') {
        return getShapeNumberProp('width', '');
    }
    return getShapeNumberProp('width', '');
});

const shapeHeight = computed(() => {
    if (!selectedShape.value) return '';
    const type = selectedShape.value.type;
    if (type === 'curve') {
        return getShapeNumberProp('height', '');
    }
    return getShapeNumberProp('height', '');
});

const curvePointsCount = computed(() => {
    if (!selectedShape.value || selectedShape.value.type !== 'curve') return 0;
    const shape = selectedShape.value as any;
    return shape.anchorPoints?.length || 0;
});

const fillColor = computed(() => getShapeStringProp('fill', '#000000'));
const strokeColor = computed(() => getShapeStringProp('stroke', '#000000'));
const fillOpacity = computed(() => getShapeNumberProp('fillOpacity', 1));
const strokeOpacity = computed(() => getShapeNumberProp('strokeOpacity', 1));
const strokeWidth = computed(() => getShapeNumberProp('strokeWidth', ''));

// список слоёв — сверху вниз (верхний слой отображается первым)
const layers = computed(() => [...shapes.value].reverse());

function layerIndexToShapeIndex(layerIndex: number) {
    return shapes.value.length - 1 - layerIndex;
}

const draggedLayerIndex = ref<number | null>(null);

type NumberFieldKey =
    | 'x'
    | 'y'
    | 'width'
    | 'height'
    | 'rotation'
    | 'strokeWidth'
    | 'scaleX'
    | 'scaleY';

function onNumberChange(key: NumberFieldKey, event: Event) {
    if (!selectedShape.value) return;
    const target = event.target as HTMLInputElement;
    const value = Number(target.value);
    if (Number.isNaN(value)) return;

    canvasStore.updateShape(selectedShape.value.id, {
        [key]: value,
    } as Partial<Shape>);
}

function onFlip(key: 'scaleX' | 'scaleY') {
    if (!selectedShape.value) return;

    const currentScale = Number((selectedShape.value as Partial<Shape>)[key]);
    const currentRotation = selectedShape.value.rotation;

    if (selectedShape.value.type === 'curve') {
        canvasStore.updateShape(selectedShape.value.id, {
            [key]: currentScale * -1,
            rotation: currentRotation, 
        });
        return;
    }

    const newRotation =
        key === 'scaleX'
            ? (360 - currentRotation) % 360
            : (180 - currentRotation + 360) % 360;

    canvasStore.updateShape(selectedShape.value.id, {
        [key]: currentScale * -1,
        rotation:
            selectedShape.value.type === 'line' ? currentRotation : newRotation,
    });
}

type ColorFieldKey = 'fill' | 'stroke';

function onColorChange(key: ColorFieldKey, event: Event) {
    if (!selectedShape.value) return;
    const target = event.target as HTMLInputElement;
    const value = target.value;

    canvasStore.updateShape(selectedShape.value.id, {
        [key]: value,
    } as Partial<Shape>);
}

type OpacityFieldKey = 'fillOpacity' | 'strokeOpacity';

function onOpacityChange(key: OpacityFieldKey, event: Event) {
    if (!selectedShape.value) return;
    const target = event.target as HTMLInputElement;
    const value = Number(target.value);
    if (Number.isNaN(value)) return;

    canvasStore.updateShape(selectedShape.value.id, {
        [key]: value,
    } as Partial<Shape>);
}

function shapeThumb(type: string) {
    if (type === 'rect') return '▭';
    if (type === 'circle') return '◯';
    if (type === 'line') return '/';
    if (type === 'triangle') return '△';
    if (type === 'polygon') return '⬔';
    if (type === 'star') return '☆';
    if (type === 'hexagon') return '⬡';
    if (type === 'arrow') return '→';
    if (type === 'curve') return '〰️';
    return '?';
// ============ МИНИАТЮРЫ СЛОЁВ (SVG) ============

function thumbFill(shape: Shape): string {
    const fill = (shape as unknown as Record<string, unknown>).fill as
        | string
        | undefined;
    if (!fill || fill === 'transparent') return '#e5e7eb';
    return fill;
}

function thumbFillOpacity(shape: Shape): number {
    const fill = (shape as unknown as Record<string, unknown>).fill as
        | string
        | undefined;
    if (!fill || fill === 'transparent') return 0.4;
    const opacity = (shape as unknown as Record<string, unknown>)
        .fillOpacity as number | undefined;
    return typeof opacity === 'number' ? Math.max(0.15, opacity) : 1;
}

function thumbStroke(shape: Shape): string {
    const stroke = (shape as unknown as Record<string, unknown>).stroke as
        | string
        | undefined;
    if (!stroke || stroke === 'transparent') return '#6b7280';
    return stroke;
}

function generatePolygonPoints(
    sides: number,
    cx: number,
    cy: number,
    r: number
): string {
    const pts: string[] = [];
    for (let i = 0; i < sides; i++) {
        const a = (i * 2 * Math.PI) / sides - Math.PI / 2;
        const x = Math.round((cx + r * Math.cos(a)) * 10) / 10;
        const y = Math.round((cy + r * Math.sin(a)) * 10) / 10;
        pts.push(`${x},${y}`);
    }
    return pts.join(' ');
}

function generateStarPoints(
    numPoints: number,
    cx: number,
    cy: number,
    outerR: number,
    innerR: number
): string {
    const pts: string[] = [];
    for (let i = 0; i < numPoints * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (i * Math.PI) / numPoints - Math.PI / 2;
        const x = Math.round((cx + r * Math.cos(a)) * 10) / 10;
        const y = Math.round((cy + r * Math.sin(a)) * 10) / 10;
        pts.push(`${x},${y}`);
    }
    return pts.join(' ');
}

function getThumbPoints(shape: Shape): string {
    const type = shape.type;
    switch (type) {
        case 'triangle':
            return '10,3 2,17 18,17';
        case 'polygon': {
            const sides =
                ((shape as unknown as Record<string, unknown>)
                    .sides as number) || 5;
            return generatePolygonPoints(sides, 10, 10, 8);
        }
        case 'star': {
            const numPoints =
                ((shape as unknown as Record<string, unknown>)
                    .numPoints as number) || 5;
            return generateStarPoints(numPoints, 10, 10, 8, 4);
        }
        case 'hexagon':
            return generatePolygonPoints(6, 10, 10, 8);
        case 'arrow':
            return '1,8 12,8 12,3 19,10 12,17 12,12 1,12';
        default:
            return generatePolygonPoints(5, 10, 10, 8);
    }
}

function shapeLabel(type: string) {
    const labels: Record<string, string> = {
        rect: 'Прямоугольник',
        circle: 'Круг',
        line: 'Линия',
        triangle: 'Треугольник',
        polygon: 'Многоугольник',
        star: 'Звезда',
        arrow: 'Стрелка',
        hexagon: 'Шестиугольник',
    };
    return labels[type] ?? type;
}

function onSelectLayer(id: string) {
    canvasStore.selectShape(id);
}

function onLayerDragStart(index: number, event: DragEvent) {
    draggedLayerIndex.value = index;
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
    }
}

function onLayerDrop(targetIndex: number, event: DragEvent) {
    let from = draggedLayerIndex.value;
    if (event.dataTransfer) {
        const raw = event.dataTransfer.getData('text/plain');
        const n = Number.parseInt(raw, 10);
        if (!Number.isNaN(n)) {
            from = n;
        }
    }
    if (from === null) return;
    const to = targetIndex;
    draggedLayerIndex.value = null;
    if (from === to) return;
    const fromShapeIndex = layerIndexToShapeIndex(from);
    const toShapeIndex = layerIndexToShapeIndex(to);
    canvasStore.moveShape(fromShapeIndex, toShapeIndex);
}

const selectedLayerIndex = computed(() => {
    if (!selectedShape.value) return -1;
    return layers.value.findIndex((s) => s.id === selectedShape.value?.id);
});

const canMoveUp = computed(() => {
    if (!selectedShape.value) return false;
    return selectedLayerIndex.value > 0;
});

const canMoveDown = computed(() => {
    if (!selectedShape.value) return false;
    return selectedLayerIndex.value < layers.value.length - 1;
});

function moveLayerUp() {
    if (!canMoveUp.value) return;
    const fromLayerIndex = selectedLayerIndex.value;
    const toLayerIndex = fromLayerIndex - 1;
    canvasStore.moveShape(
        layerIndexToShapeIndex(fromLayerIndex),
        layerIndexToShapeIndex(toLayerIndex)
    );
}

function moveLayerDown() {
    if (!canMoveDown.value) return;
    const fromLayerIndex = selectedLayerIndex.value;
    const toLayerIndex = fromLayerIndex + 1;
    canvasStore.moveShape(
        layerIndexToShapeIndex(fromLayerIndex),
        layerIndexToShapeIndex(toLayerIndex)
    );
}

function startEditing(shapeId: string) {
    console.log('DOUBLE CLICK WORKS', shapeId);
    editingLayerId.value = shapeId;

    nextTick(() => {
        const input = inputRefs.value[shapeId];
        if (input) {
            input.focus();
            input.select();
        }
    });
}

function cancelEditing() {
    editingLayerId.value = null;
}

function onLayerNameBlur(shapeId: string, event: Event) {
    const target = event.target as HTMLInputElement;
    saveLayerName(shapeId, target.value);
}

function onLayerNameEnter(shapeId: string, event: Event) {
    const target = event.target as HTMLInputElement;
    saveLayerName(shapeId, target.value);
}

function saveLayerName(shapeId: string, newName: string) {
    if (!newName.trim()) {
        cancelEditing();
        return;
    }

    const shape = shapes.value.find((s) => s.id === shapeId);
    if (shape) {
        canvasStore.updateShape(shapeId, {
            name: newName.trim(),
        } as Partial<Shape>);
    }

    cancelEditing();
}
</script>

<style scoped>
.panel {
    width: 240px;
    max-width: 240px;
    min-width: 240px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);

    padding: 12px;

    max-height: 55vh;
    overflow: auto;
}

.panel {
    scrollbar-gutter: stable;
}

.groupTitle {
    font-weight: 800;
    font-size: 16px;
    margin: 0 0 4px;
    color: #111827;
}

.group {
    display: grid;
    gap: 6px;
}

.divider {
    height: 1px;
    background: #e5e7eb;
    margin: 8px 0;
}

.fieldBlock {
    display: grid;
    gap: 4px;
}

.fieldLabel {
    font-size: 12px;
    color: #374151;
}

.grid1 {
    display: grid;
    grid-template-columns: 1fr;
}

.grid2 {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
}

.grid2Blocks {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}

.fieldStub {
    height: 16px;
    border-radius: 8px;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
}

.fieldInput {
    width: 100%;
    height: 24px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    padding: 0 6px;
    font-size: 12px;
    color: #111827;
    background: #ffffff;
}

.fieldInput:disabled {
    background: #f9fafb;
    color: #9ca3af;
}

.colorInput {
    width: 100%;
    height: 24px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    padding: 0;
    background: #ffffff;
}

.layersRow {
    display: flex;
    gap: 10px;
    margin-top: 4px;
}

.iconBtn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    cursor: pointer;
}

.iconBtn:hover {
    background: #f3f4f6;
}

.spacer {
    height: 20px;
}

.layersList {
    list-style: none;
    padding: 0;
    margin: 0;

    display: grid;
    gap: 6px;
}

.layerItem {
    width: 100%;
    display: grid;
    grid-template-columns: 24px 1fr;
    align-items: center;
    gap: 8px;

    padding: 6px 8px;
    border-radius: 10px;

    background: #ffffff;
    border: 1px solid transparent;
    cursor: pointer;

    text-align: left;
    color: #111827;
}

.layerItem:hover {
    background: #f3f4f6;
}

.layerItem:focus {
    outline: none;
}

.layerItem:focus-visible {
    outline: 2px solid rgba(37, 99, 235, 0.55);
    outline-offset: 2px;
    border-radius: 10px;
}

.layerItem.isActive {
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.3);
}

.thumb {
    width: 24px;
    height: 24px;
    border-radius: 6px;

    display: grid;
    place-items: center;

    background: #ffffff;
    border: 1px solid #e5e7eb;

    user-select: none;
    flex-shrink: 0;
}

.thumbSvg {
    width: 18px;
    height: 18px;
    display: block;
}

.layerName {
    font-size: 12px;
    font-weight: 500;
    color: #111827;

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.iconBtnSmall {
    width: 100%;
    height: 24px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 14px;
    color: #374151;
    transition: all 0.2s;
}

.iconBtnSmall:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #d1d5db;
}

.iconBtnSmall:active:not(:disabled) {
    background: #e5e7eb;
    transform: translateY(1px);
}

.iconBtnSmall:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f9fafb;
}

.layersHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    padding-right: 4px;
}

.layerControls {
    display: flex;
    gap: 4px;
}

.layerItem:hover {
    background: #f3f4f6;
}

.layerItem:focus {
    outline: none;
}

.layerItem:focus-visible {
    outline: 2px solid rgba(37, 99, 235, 0.55);
    outline-offset: 2px;
    border-radius: 10px;
}

.layerItem.isActive {
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.3);
}

/* Стили для инпута редактирования имени */
.layerNameInput {
    font-size: 12px;
    font-weight: 500;
    color: #111827;
    background: #ffffff;
    border: 1px solid #2563eb;
    border-radius: 4px;
    padding: 2px 4px;
    margin: -2px 0;
    width: 100%;
    outline: none;
    font-family: inherit;
}

.layerNameInput:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}
</style>

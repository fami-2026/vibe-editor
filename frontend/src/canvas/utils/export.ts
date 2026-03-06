import type { Shape } from '@/canvas/types';

export type ExportFormat = 'png' | 'svg';
export type ExportArea = 'scene' | 'selection';
export type PngScale = 1 | 2 | 3;
export type PngBackground = 'transparent' | 'white';

export interface ExportSceneSize {
    width: number;
    height: number;
}

export interface ExportOptions {
    format: ExportFormat;
    fileName: string;
    area: ExportArea;
    shapes: Shape[];
    selectedId: string | null;
    sceneSize: ExportSceneSize;
    pngScale?: PngScale;
    pngBackground?: PngBackground;
}

interface ExportBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ExportTarget {
    shapes: Shape[];
    bounds: ExportBounds;
}

const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

export function sanitizeFileName(name: string): string {
    const cleaned = name
        .replace(/\.[a-zA-Z0-9]+$/, '')
        .replace(ILLEGAL_FILENAME_CHARS, '_')
        .trim()
        .replace(/\s+/g, ' ');

    return cleaned || 'vector-export';
}

export function buildDefaultFileName(
    format: ExportFormat,
    baseName = 'vector'
): string {
    const now = new Date();
    const date = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
    ].join('-');
    const time = [
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0'),
        String(now.getMilliseconds()).padStart(3, '0'),
    ].join('-');

    return `${sanitizeFileName(baseName)}-${date}-${time}.${format}`;
}

export async function exportScene(options: ExportOptions): Promise<void> {
    const target = resolveExportTarget(options);
    if (!target) {
        throw new Error(
            options.area === 'selection'
                ? 'Сначала выделите фигуру для экспорта.'
                : 'Нет фигур для экспорта.'
        );
    }

    const fileName = ensureExtension(options.fileName, options.format);

    if (options.format === 'png') {
        await exportPng(target, fileName, options);
        return;
    }

    exportSvg(target, fileName, options);
}

function resolveExportTarget(options: ExportOptions): ExportTarget | null {
    if (options.area === 'selection') {
        const shape = options.shapes.find((item) => item.id === options.selectedId);
        if (!shape) return null;

        const bounds = shape.getBoundingBox();
        return {
            shapes: [shape],
            bounds: normalizeBounds(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY),
        };
    }

    if (options.shapes.length === 0) return null;

    const width = Math.max(1, Math.round(options.sceneSize.width));
    const height = Math.max(1, Math.round(options.sceneSize.height));

    return {
        shapes: options.shapes,
        bounds: { x: 0, y: 0, width, height },
    };
}

async function exportPng(
    target: ExportTarget,
    fileName: string,
    options: ExportOptions
): Promise<void> {
    const scale = options.pngScale ?? 1;
    const background = options.pngBackground ?? 'transparent';

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(target.bounds.width * scale));
    canvas.height = Math.max(1, Math.round(target.bounds.height * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Не удалось получить контекст canvas для PNG-экспорта.');
    }

    ctx.scale(scale, scale);

    if (background === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, target.bounds.width, target.bounds.height);
    }

    ctx.translate(-target.bounds.x, -target.bounds.y);

    for (const shape of target.shapes) {
        ctx.save();
        shape.render(ctx);
        ctx.restore();
    }

    const blob = await canvasToBlob(canvas, 'image/png');
    triggerDownload(blob, fileName);
}

function exportSvg(
    target: ExportTarget,
    fileName: string,
    options: ExportOptions
): void {
    const width = round2(target.bounds.width);
    const height = round2(target.bounds.height);
    const offsetX = target.bounds.x;
    const offsetY = target.bounds.y;

    const parts: string[] = [];
    parts.push(
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    );

    if ((options.pngBackground ?? 'transparent') === 'white') {
        parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />`);
    }

    for (const shape of target.shapes) {
        const svgNode = shapeToSvg(shape, offsetX, offsetY);
        if (svgNode) parts.push(svgNode);
    }

    parts.push(`</svg>`);

    const blob = new Blob([parts.join('\n')], {
        type: 'image/svg+xml;charset=utf-8',
    });
    triggerDownload(blob, fileName);
}

function shapeToSvg(shape: Shape, offsetX: number, offsetY: number): string | null {
    switch (shape.type) {
        case 'rect': {
            const width = getNum(shape, 'width');
            const height = getNum(shape, 'height');
            const fill = getStr(shape, 'fill', '#000000');
            const stroke = getStr(shape, 'stroke', 'none');
            const fillOpacity = clampOpacity(getNum(shape, 'fillOpacity', 1));
            const strokeOpacity = clampOpacity(getNum(shape, 'strokeOpacity', 1));
            const strokeWidth = getNum(shape, 'strokeWidth', 1);

            const x = round2(shape.position.x - width / 2 - offsetX);
            const y = round2(shape.position.y - height / 2 - offsetY);

            return `<rect x="${x}" y="${y}" width="${round2(width)}" height="${round2(height)}" fill="${escapeXml(fill)}" fill-opacity="${fillOpacity}" stroke="${escapeXml(stroke)}" stroke-width="${round2(strokeWidth)}" stroke-opacity="${strokeOpacity}" />`;
        }

        case 'circle': {
            const radiusX = getNum(shape, 'radiusX', 1);
            const radiusY = getNum(shape, 'radiusY', 1);
            const fill = getStr(shape, 'fill', '#000000');
            const stroke = getStr(shape, 'stroke', 'none');
            const fillOpacity = clampOpacity(getNum(shape, 'fillOpacity', 1));
            const strokeOpacity = clampOpacity(getNum(shape, 'strokeOpacity', 1));
            const strokeWidth = getNum(shape, 'strokeWidth', 1);

            const cx = round2(shape.position.x - offsetX);
            const cy = round2(shape.position.y - offsetY);

            return `<ellipse cx="${cx}" cy="${cy}" rx="${round2(radiusX)}" ry="${round2(radiusY)}" fill="${escapeXml(fill)}" fill-opacity="${fillOpacity}" stroke="${escapeXml(stroke)}" stroke-width="${round2(strokeWidth)}" stroke-opacity="${strokeOpacity}" />`;
        }

        case 'line': {
            const x1 = round2(shape.position.x - offsetX);
            const y1 = round2(shape.position.y - offsetY);
            const x2 = round2(getNum(shape, 'endPoint.x', shape.position.x) - offsetX);
            const y2 = round2(getNum(shape, 'endPoint.y', shape.position.y) - offsetY);
            const stroke = getStr(shape, 'stroke', '#000000');
            const strokeWidth = getNum(shape, 'strokeWidth', 1);
            const strokeOpacity = clampOpacity(getNum(shape, 'strokeOpacity', 1));

            return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${escapeXml(stroke)}" stroke-width="${round2(strokeWidth)}" stroke-opacity="${strokeOpacity}" stroke-linecap="round" />`;
        }

        default:
            return null;
    }
}

function getNum(shape: Shape, path: string, fallback = 0): number {
    const value = getPathValue(shape, path);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getStr(shape: Shape, key: string, fallback = ''): string {
    const value = (shape as unknown as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : fallback;
}

function getPathValue(source: unknown, path: string): unknown {
    const segments = path.split('.');
    let current: unknown = source;

    for (const segment of segments) {
        if (!current || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[segment];
    }

    return current;
}

function clampOpacity(value: number): number {
    return round2(Math.min(1, Math.max(0, value)));
}

function normalizeBounds(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
): ExportBounds {
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    return { x: minX, y: minY, width, height };
}

function ensureExtension(fileName: string, format: ExportFormat): string {
    const safeBase = sanitizeFileName(fileName);
    return `${safeBase}.${format}`;
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&apos;');
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Не удалось сформировать файл экспорта.'));
                return;
            }
            resolve(blob);
        }, mimeType);
    });
}

function triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}

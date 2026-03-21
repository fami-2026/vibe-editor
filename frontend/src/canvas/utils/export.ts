import type { Shape } from '@/canvas/types';

export type ExportFormat = 'png';
export type ExportArea = 'scene';
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

const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*]/g;
const CONTROL_CHARS = /\p{Cc}/gu;

export function sanitizeFileName(name: string): string {
    const cleaned = name
        .replace(/\.[a-zA-Z0-9]+$/, '')
        .replace(ILLEGAL_FILENAME_CHARS, '_')
        .replace(CONTROL_CHARS, '_')
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
        throw new Error('Нет фигур для экспорта.');
    }

    const totalBounds = getTotalBounds(options.shapes);
    const fileName = ensureExtension(options.fileName, options.format);

    await exportPng(
        {
            shapes: options.shapes,
            bounds: totalBounds,
        },
        fileName,
        options
    );
}

function resolveExportTarget(options: ExportOptions): ExportTarget | null {
    if (options.shapes.length === 0) return null;

    const bounds = getTotalBounds(options.shapes);

    return {
        shapes: options.shapes,
        bounds: bounds,
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
        throw new Error(
            'Не удалось получить контекст canvas для PNG-экспорта.'
        );
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

function ensureExtension(fileName: string, format: ExportFormat): string {
    const safeBase = sanitizeFileName(fileName);
    return `${safeBase}.${format}`;
}

function canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: string
): Promise<Blob> {
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

function getTotalBounds(shapes: Shape[]): ExportBounds {
    if (shapes.length === 0) {
        return { x: 0, y: 0, width: 1, height: 1 };
    }

    const bounds = shapes.map((shape) => shape.getBoundingBox());

    const minX = Math.min(...bounds.map((b) => b.minX));
    const minY = Math.min(...bounds.map((b) => b.minY));
    const maxX = Math.max(...bounds.map((b) => b.maxX));
    const maxY = Math.max(...bounds.map((b) => b.maxY));

    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);

    return { x: minX, y: minY, width, height };
}

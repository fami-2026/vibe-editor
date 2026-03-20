export interface CanvasDocument<TContent = Record<string, unknown>> {
    id: string;
    content: TContent;
    createdAt?: string;
    updatedAt?: string;
}

interface ApiResponse<TData> {
    code: number;
    data?: TData;
    message?: string;
}

export class CanvasApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'CanvasApiError';
        this.status = status;
    }
}

export class CanvasNotFoundError extends CanvasApiError {
    constructor(message: string = 'Документ не найден') {
        super(message, 404);
        this.name = 'CanvasNotFoundError';
    }
}

const DEFAULT_SERVER_PORT = '8080';

function resolveServerAddress(): string {
    const configured = String(import.meta.env.VITE_SERVER_ADDR ?? '').trim();
    if (configured.length > 0) {
        return configured;
    }

    if (typeof window !== 'undefined' && window.location.hostname) {
        return `${window.location.hostname}:${DEFAULT_SERVER_PORT}`;
    }

    return `localhost:${DEFAULT_SERVER_PORT}`;
}

const SERVER_ADDR = resolveServerAddress();
const BASE_URL = `http://${SERVER_ADDR}/api/canvas`;

function toObjectContent(content: unknown): Record<string, unknown> {
    if (typeof content === 'string') {
        try {
            const parsed = JSON.parse(content) as Record<string, unknown>;
            return parsed ?? {};
        } catch {
            return {};
        }
    }

    if (content && typeof content === 'object') {
        return content as Record<string, unknown>;
    }

    return {};
}

function normalizeCanvas(raw: {
    id?: string | number;
    content?: unknown;
    createdAt?: string;
    updatedAt?: string;
}): CanvasDocument {
    return {
        id: String(raw.id ?? '0'),
        content: toObjectContent(raw.content),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
    };
}

async function request<TData>(
    url: string,
    init: RequestInit
): Promise<ApiResponse<TData>> {
    let response: Response;

    try {
        response = await fetch(url, {
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                ...init.headers,
            },
            ...init,
        });
    } catch (error) {
        throw new CanvasApiError(
            `Сервер недоступен: ${(error as Error).message}`,
            0
        );
    }

    let payload: ApiResponse<TData> | null = null;

    try {
        payload = (await response.json()) as ApiResponse<TData>;
    } catch {
        payload = null;
    }

    if (!response.ok) {
        const message = payload?.message ?? `HTTP ${response.status}`;

        if (response.status === 404) {
            throw new CanvasNotFoundError(message);
        }

        throw new CanvasApiError(message, response.status);
    }

    if (!payload) {
        throw new CanvasApiError('Пустой ответ от сервера', response.status);
    }

    return payload;
}

export async function createCanvas(
    content: Record<string, unknown> = {}
): Promise<CanvasDocument> {
    const payload = await request<CanvasDocument>(BASE_URL, {
        method: 'POST',
        body: JSON.stringify({ content: JSON.stringify(content) }),
    });

    return normalizeCanvas(payload.data ?? { id: '0', content });
}

export async function getCanvasById(id: string): Promise<CanvasDocument> {
    const payload = await request<CanvasDocument>(`${BASE_URL}/${id}`, {
        method: 'GET',
    });

    return normalizeCanvas(payload.data ?? { id, content: {} });
}

export async function updateCanvas(
    id: string,
    content: Record<string, unknown>
): Promise<CanvasDocument> {
    const payload = await request<CanvasDocument>(`${BASE_URL}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ id, content: JSON.stringify(content) }),
    });

    return normalizeCanvas(payload.data ?? { id, content });
}

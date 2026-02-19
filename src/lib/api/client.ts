import ky, { HTTPError, type Options } from "ky";

const DEFAULT_API_BASE_URL = "http://localhost:8080/api/v1";
const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ??
  DEFAULT_API_BASE_URL;

export type ApiEnvelope<TData = unknown, TMeta = unknown> = {
  success: boolean;
  message?: string;
  data?: TData;
  meta?: TMeta;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  request_id?: string;
};

export type ApiResult<TData, TMeta = unknown> = {
  data?: TData;
  message?: string;
  meta?: TMeta;
  requestId?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      details?: unknown;
      requestId?: string;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId;
  }
}

const api = ky.create({
  prefixUrl: apiBaseUrl,
  timeout: 15_000,
  headers: {
    Accept: "application/json",
  },
});

function toApiError(status: number, envelope: ApiEnvelope<unknown>): ApiError {
  const message =
    envelope.error?.message ?? envelope.message ?? `Request failed with status ${status}`;

  return new ApiError(message, {
    status,
    code: envelope.error?.code,
    details: envelope.error?.details,
    requestId: envelope.request_id,
  });
}

async function normalizeError(error: unknown): Promise<ApiError> {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof HTTPError) {
    const status = error.response.status;

    try {
      const envelope = (await error.response.clone().json()) as ApiEnvelope<unknown>;
      return toApiError(status, envelope);
    } catch {
      return new ApiError(`HTTP ${status}`, { status });
    }
  }

  if (error instanceof Error) {
    return new ApiError(error.message, { status: 0, details: error });
  }

  return new ApiError("Unknown error", { status: 0, details: error });
}

export async function requestApi<TData, TMeta = unknown>(
  path: string,
  options?: Options,
): Promise<ApiResult<TData, TMeta>> {
  try {
    const envelope = (await api(path, options).json()) as ApiEnvelope<
      TData,
      TMeta
    >;

    if (!envelope.success) {
      throw toApiError(400, envelope as ApiEnvelope<unknown>);
    }

    return {
      data: envelope.data,
      message: envelope.message,
      meta: envelope.meta,
      requestId: envelope.request_id,
    };
  } catch (error) {
    throw await normalizeError(error);
  }
}

export async function requestData<TData>(
  path: string,
  options?: Options,
): Promise<TData> {
  const result = await requestApi<TData>(path, options);

  if (result.data === undefined) {
    throw new ApiError("Response data is empty", { status: 500 });
  }

  return result.data;
}

export function getErrorMessage(
  error: unknown,
  fallback = "Terjadi kesalahan saat memproses permintaan.",
): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

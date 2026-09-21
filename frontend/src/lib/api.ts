type ApiPayload<T> = T & { message?: string | string[] };

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: HeadersInit = {
    ...(options.headers as Record<string, string>),
  };
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
  });

  const data = (await res.json().catch(() => null)) as ApiPayload<T> | null;

  if (!res.ok) {
    const m = data?.message;
    const message = Array.isArray(m)
      ? m.join(" ")
      : typeof m === "string"
        ? m
        : "Ocurrió un error inesperado.";
    throw new ApiClientError(message, res.status);
  }

  return data as T;
}
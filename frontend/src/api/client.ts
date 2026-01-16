type RequestOptions = {
  method?: string;
  body?: unknown;
  credentials?: RequestCredentials;
};

export const apiFetch = async <T>(url: string, options: RequestOptions = {}): Promise<T> => {
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    credentials: options.credentials || "same-origin",
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error || "Request failed";
    throw new Error(message);
  }
  return data as T;
};

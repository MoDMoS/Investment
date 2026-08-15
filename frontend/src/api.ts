const API = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = (await response.json().catch(() => ({}))) as {
    message?: string | string[];
  };

  if (!response.ok) {
    if (
      response.status === 401 &&
      !path.startsWith('/auth/login') &&
      !path.startsWith('/auth/register')
    ) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    const message = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || (response.status === 401 ? 'กรุณาเข้าสู่ระบบ' : 'เกิดข้อผิดพลาด');
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

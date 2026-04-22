import { useAuthStore } from '@/stores/auth-store';

/**
 * Centralized API client that automatically adds JWT auth token
 * to all requests. Use this instead of raw fetch() for authenticated endpoints.
 */

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  private baseUrl = '';

  constructor() {
    // All requests are relative (Caddy proxy handles routing)
    this.baseUrl = '';
  }

  private getAuthHeaders(): HeadersInit {
    const token = useAuthStore.getState().token;
    const clinicId = useAuthStore.getState().user?.clinicId;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    if (clinicId) {
      (headers as Record<string, string>)['x-clinic-id'] = clinicId;
    }
    return headers;
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return url;
  }

  async get<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async post<T = unknown>(path: string, body?: unknown, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async put<T = unknown>(path: string, body?: unknown, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async delete<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  /**
   * For mini-service proxies that need XTransformPort.
   * These don't need JWT auth since they're proxied internally.
   */
  async proxyGet<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    const clinicId = useAuthStore.getState().user?.clinicId;
    const headers: HeadersInit = {};
    if (clinicId) {
      (headers as Record<string, string>)['x-clinic-id'] = clinicId;
    }
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async proxyPost<T = unknown>(path: string, body?: unknown, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    const clinicId = useAuthStore.getState().user?.clinicId;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (clinicId) {
      (headers as Record<string, string>)['x-clinic-id'] = clinicId;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  }
}

export const api = new ApiClient();
export default api;

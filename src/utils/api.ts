import { Capacitor, CapacitorHttp } from '@capacitor/core';

/**
 * URL del servidor compartido en la nube para sincronización entre dispositivos (.apk y web).
 */
export const DEFAULT_REMOTE_SERVER_URL = 'https://ais-pre-x5o23dw5dokdisr4elvbbw-542088184903.us-west2.run.app';

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  const customUrl = localStorage.getItem('famichat_server_url');
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  const isNative = Capacitor.isNativePlatform();
  const isLocalhostWebView =
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    window.location.port !== '3000';

  if (isNative || isLocalhostWebView) {
    return DEFAULT_REMOTE_SERVER_URL;
  }

  return '';
}

/**
 * Cliente HTTP universal para FamiChat que funciona tanto en navegador web
 * como dentro del APK nativo de Android (usando CapacitorHttp para evitar bloqueos CORS del WebView).
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${baseUrl}${normalizedPath}`;

  if (Capacitor.isNativePlatform()) {
    try {
      const method = (options.method || 'GET').toUpperCase();
      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(options.headers as Record<string, string> | undefined),
      };

      let data: any = undefined;
      if (options.body && typeof options.body === 'string') {
        try {
          data = JSON.parse(options.body);
        } catch {
          data = options.body;
        }
      }

      const nativeRes = await CapacitorHttp.request({
        url: fullUrl,
        method,
        headers,
        data,
        connectTimeout: 8000,
        readTimeout: 8000,
      });

      const responseBody =
        typeof nativeRes.data === 'string'
          ? nativeRes.data
          : JSON.stringify(nativeRes.data ?? {});

      return new Response(responseBody, {
        status: nativeRes.status || 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (nativeErr) {
      // Fallback to standard fetch if CapacitorHttp fails
      return fetch(fullUrl, options);
    }
  }

  return fetch(fullUrl, options);
}

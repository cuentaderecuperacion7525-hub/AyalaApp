import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

// ============================================================================
// CONFIGURACIÓN CENTRALIZADA DE REPOSITORIO DE GITHUB Y DETECCIÓN DE VERSIÓN
// ============================================================================

export const GITHUB_OWNER = "cuentaderecuperacion7525-hub";
export const GITHUB_REPO = "AyalaApp";

// Versión de respaldo únicamente cuando se ejecuta en navegador web fuera del APK nativo
const WEB_FALLBACK_VERSION = "1.0.0";

export interface ReleaseInfo {
  version: string;      // Siempre con prefijo "v", ej. "v1.0.15"
  cleanVersion: string; // Sin prefijo "v", ej. "1.0.15"
  body: string;
  downloadUrl: string;
  releaseUrl: string;
}

/**
 * Obtiene la versión real instalada de la aplicación nativa mediante @capacitor/app.
 */
export async function getInstalledAppVersion(): Promise<string> {
  try {
    if (Capacitor.isNativePlatform()) {
      const info = await CapApp.getInfo();
      if (info && info.version) {
        return info.version.trim().replace(/^v/i, '');
      }
    }
  } catch (e) {
    console.warn('No se pudo leer App.getInfo(), usando versión de respaldo:', e);
  }
  return WEB_FALLBACK_VERSION;
}

/**
 * Quita la "v" del tag_name y compara con la versión instalada numéricamente,
 * por partes (ej. 1.2.41 > 1.2.9).
 * Devuelve:
 *   1 si remoteTag > currentVersion (hay actualización)
 *   0 si son iguales
 *  -1 si remoteTag < currentVersion
 */
export function compareVersions(remoteTag: string, currentVersion: string): number {
  const sanitize = (v: string) => v.trim().replace(/^v/i, '');
  const p1 = sanitize(remoteTag).split('.').map(n => parseInt(n, 10) || 0);
  const p2 = sanitize(currentVersion).split('.').map(n => parseInt(n, 10) || 0);
  const maxLen = Math.max(p1.length, p2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = p1[i] ?? 0;
    const num2 = p2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Consulta la última release publicada en GitHub usando CapacitorHttp nativo
 * para evitar bloqueos CORS del WebView. No envía datos de usuarios ni mensajes.
 */
export async function fetchLatestRelease(installedVersionOverride?: string): Promise<{
  success: boolean;
  hasUpdate: boolean;
  installedVersion: string;
  release?: ReleaseInfo;
  errorMessage?: string;
}> {
  const installedVersion = installedVersionOverride || (await getInstalledAppVersion());

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      hasUpdate: false,
      installedVersion,
      errorMessage: 'Sin internet'
    };
  }

  try {
    const cacheBuster = `t=${Date.now()}`;
    const latestUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest?${cacheBuster}`;
    let response = await CapacitorHttp.get({
      url: latestUrl,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'FamiChat-App',
        'Cache-Control': 'no-cache'
      }
    });

    let releaseData: any = null;

    if (response.status >= 200 && response.status < 300) {
      releaseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } else if (response.status === 404) {
      // Respaldo: consultar la lista de releases por si la última no fue marcada como 'latest'
      const listUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=5&${cacheBuster}`;
      const listRes = await CapacitorHttp.get({
        url: listUrl,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'FamiChat-App',
          'Cache-Control': 'no-cache'
        }
      });

      if (listRes.status >= 200 && listRes.status < 300) {
        const listData = typeof listRes.data === 'string' ? JSON.parse(listRes.data) : listRes.data;
        if (Array.isArray(listData) && listData.length > 0) {
          releaseData = listData[0];
        } else {
          return {
            success: false,
            hasUpdate: false,
            installedVersion,
            errorMessage: 'Aún no hay releases publicadas en GitHub'
          };
        }
      } else if (listRes.status === 404) {
        return {
          success: false,
          hasUpdate: false,
          installedVersion,
          errorMessage: 'Repo privado en GitHub (cámbialo a Public)'
        };
      } else {
        return {
          success: false,
          hasUpdate: false,
          installedVersion,
          errorMessage: `Error al consultar GitHub (código ${listRes.status})`
        };
      }
    } else {
      return {
        success: false,
        hasUpdate: false,
        installedVersion,
        errorMessage: `Error al consultar GitHub (código ${response.status})`
      };
    }

    const rawTag = (releaseData?.tag_name || '').trim();

    if (!rawTag) {
      return {
        success: false,
        hasUpdate: false,
        installedVersion,
        errorMessage: 'No se encontró ninguna release'
      };
    }

    const cleanTag = rawTag.replace(/^v/i, '');
    const displayTag = `v${cleanTag}`;
    const isNewer = compareVersions(cleanTag, installedVersion) > 0;

    // Buscar activo .apk en la release
    let apkDownloadUrl = '';
    if (Array.isArray(releaseData.assets)) {
      const apkAsset = releaseData.assets.find(
        (asset: any) => typeof asset?.name === 'string' && asset.name.toLowerCase().endsWith('.apk')
      );
      if (apkAsset?.browser_download_url) {
        apkDownloadUrl = apkAsset.browser_download_url;
      }
    }

    const fallbackReleaseUrl = releaseData.html_url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

    return {
      success: true,
      hasUpdate: isNewer,
      installedVersion,
      release: {
        version: displayTag,
        cleanVersion: cleanTag,
        body: releaseData.body || 'Nuevas mejoras y optimizaciones para la familia.',
        downloadUrl: apkDownloadUrl || fallbackReleaseUrl,
        releaseUrl: fallbackReleaseUrl
      }
    };
  } catch (err) {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    return {
      success: false,
      hasUpdate: false,
      installedVersion,
      errorMessage: isOffline ? 'Sin internet' : 'No se pudo comprobar. Revisa tu conexión.'
    };
  }
}

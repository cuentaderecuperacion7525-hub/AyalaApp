// ============================================================================
// CONFIGURACIÓN CENTRALIZADA DE VERSIÓN Y REPOSITORIO DE GITHUB
// ============================================================================

// Versión actual de la aplicación
export const APP_VERSION = "1.0.0";

// Datos del repositorio en GitHub (fáciles de modificar)
export const GITHUB_OWNER = "cuentaderecuperacion7525-hub";
export const GITHUB_REPO = "AyalaApp";

export interface ReleaseInfo {
  version: string;
  body: string;
  downloadUrl: string;
  releaseUrl: string;
}

/**
 * Compara dos cadenas de versión numéricamente, por partes (ej. "v1.3.0" vs "1.0.0").
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
 * Consulta la API pública de GitHub para obtener la última release publicada.
 * No envía ningún dato de usuario ni de mensajes.
 */
export async function fetchLatestRelease(): Promise<{
  success: boolean;
  hasUpdate: boolean;
  release?: ReleaseInfo;
  errorMessage?: string;
}> {
  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Aún no hay ninguna release publicada en el repositorio
        return { success: true, hasUpdate: false };
      }
      return { success: false, hasUpdate: false, errorMessage: 'No se pudo comprobar. Revisa tu conexión.' };
    }

    const data = await response.json();
    const tagName = (data.tag_name || '').trim();
    if (!tagName) {
      return { success: true, hasUpdate: false };
    }

    const isNewer = compareVersions(tagName, APP_VERSION) > 0;

    // Buscar si existe un activo .apk adjunto a la release
    let apkDownloadUrl = '';
    if (Array.isArray(data.assets)) {
      const apkAsset = data.assets.find(
        (asset: any) => typeof asset?.name === 'string' && asset.name.toLowerCase().endsWith('.apk')
      );
      if (apkAsset?.browser_download_url) {
        apkDownloadUrl = apkAsset.browser_download_url;
      }
    }

    const fallbackReleaseUrl = data.html_url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

    return {
      success: true,
      hasUpdate: isNewer,
      release: {
        version: tagName,
        body: data.body || 'Nuevas mejoras y optimizaciones para la familia.',
        downloadUrl: apkDownloadUrl || fallbackReleaseUrl,
        releaseUrl: fallbackReleaseUrl
      }
    };
  } catch (err) {
    return {
      success: false,
      hasUpdate: false,
      errorMessage: 'No se pudo comprobar. Revisa tu conexión.'
    };
  }
}

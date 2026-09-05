/**
 * Network Configuration & Server Bridge Discovery
 * Handles dynamic routing for Desktop (Electron), Web, and Mobile (Android / Capacitor).
 */

export function getStoredBackendUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('xterminal_backend_url') || '';
}

export function setStoredBackendUrl(url: string): void {
  if (typeof window === 'undefined') return;
  let clean = url.trim();
  if (clean.endsWith('/')) clean = clean.slice(0, -1);
  if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `http://${clean}`;
  }
  localStorage.setItem('xterminal_backend_url', clean);
  // Dispatch event so all components react immediately
  window.dispatchEvent(new CustomEvent('xterminal:backend-url-changed', { detail: { url: clean } }));
}

export function isMobileApp(): boolean {
  if (typeof window === 'undefined') return false;
  const isCapacitor = Boolean((window as any).Capacitor);
  // In Capacitor Android WebView, hostname is localhost and port is empty
  const isAndroidWebView = window.location.hostname === 'localhost' && window.location.port === '';
  return isCapacitor || isAndroidWebView;
}

export function getEffectiveBackendUrl(): string {
  const stored = getStoredBackendUrl();
  if (stored) return stored;

  if (typeof window !== 'undefined') {
    // If not in a mobile webview with empty port, use current window origin
    if (window.location.port !== '' || window.location.hostname !== 'localhost') {
      return `${window.location.protocol}//${window.location.host}`;
    }
  }
  return '';
}

export function getBackendHttpUrl(apiPath: string): string {
  const cleanPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const base = getEffectiveBackendUrl();
  if (base) {
    return `${base}${cleanPath}`;
  }
  return cleanPath;
}

export function getBackendWsUrl(wsPath: string): string {
  const cleanPath = wsPath.startsWith('/') ? wsPath : `/${wsPath}`;
  const base = getEffectiveBackendUrl();
  if (base) {
    try {
      const parsed = new URL(base);
      const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProto}//${parsed.host}${cleanPath}`;
    } catch {}
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || '127.0.0.1:3000';
  return `${wsProtocol}//${host}${cleanPath}`;
}

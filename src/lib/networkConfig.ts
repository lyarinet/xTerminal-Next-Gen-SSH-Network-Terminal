/**
 * Network Configuration & Server Bridge Discovery
 * Handles dynamic routing for Desktop (Electron), Web, and Mobile (Android / Capacitor).
 */

export const DEFAULT_LAN_BRIDGE_URL = 'http://192.168.1.38:3000';
export const DEFAULT_LOCAL_BRIDGE_PORT = 3000;

export function isElectron(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).xterminalxNative ||
    (window as any).process?.versions?.electron ||
    window.navigator.userAgent.includes('Electron') ||
    window.location.protocol === 'file:'
  );
}

export function isMobileApp(): boolean {
  if (typeof window === 'undefined') return false;
  const isCapacitor = Boolean((window as any).Capacitor);
  // In Capacitor Android WebView, hostname is localhost and port is empty
  const isAndroidWebView = window.location.hostname === 'localhost' && window.location.port === '';
  return isCapacitor || isAndroidWebView;
}

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

export function getEffectiveBackendUrl(): string {
  // 1. User manual override always takes precedence
  const stored = getStoredBackendUrl();
  if (stored) return stored;

  if (typeof window === 'undefined') return `http://127.0.0.1:${DEFAULT_LOCAL_BRIDGE_PORT}`;

  // 2. If running inside Electron desktop app (either via http://127.0.0.1 or file:/// protocol)
  if (isElectron()) {
    const nativePort = (window as any).xterminalxNative?.backendPort;
    const port = nativePort || (window.location.port ? Number(window.location.port) : DEFAULT_LOCAL_BRIDGE_PORT);
    return `http://127.0.0.1:${port}`;
  }

  // 3. If running inside Mobile app (Android Capacitor / WebView)
  if (isMobileApp()) {
    // Return pre-configured LAN IP so mobile immediately works on Wi-Fi without manual setup
    return DEFAULT_LAN_BRIDGE_URL;
  }

  // 4. In standard Web Browser
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    // If running on Vite dev server (port 5173), direct backend calls to port 3000
    if (window.location.port === '5173') {
      return `http://${window.location.hostname}:${DEFAULT_LOCAL_BRIDGE_PORT}`;
    }
    return `${window.location.protocol}//${window.location.host}`;
  }

  return `http://127.0.0.1:${DEFAULT_LOCAL_BRIDGE_PORT}`;
}

export function getBackendHttpUrl(apiPath: string): string {
  const cleanPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const base = getEffectiveBackendUrl();
  return `${base}${cleanPath}`;
}

export function getBackendWsUrl(wsPath: string): string {
  const cleanPath = wsPath.startsWith('/') ? wsPath : `/${wsPath}`;
  const base = getEffectiveBackendUrl();
  try {
    const parsed = new URL(base);
    const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = parsed.host || `127.0.0.1:${DEFAULT_LOCAL_BRIDGE_PORT}`;
    return `${wsProto}//${host}${cleanPath}`;
  } catch {
    return `ws://127.0.0.1:${DEFAULT_LOCAL_BRIDGE_PORT}${cleanPath}`;
  }
}

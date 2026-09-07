import { getBackendHttpUrl, getBackendWsUrl, isMobileApp } from './networkConfig';

export interface DiagnosticStep {
  step?: string;
  name?: string;
  durationMs?: number;
  latencyMs?: number;
  status: 'success' | 'failure';
  details?: string;
}

export interface DiagnosticProbeResult {
  host: string;
  port: number;
  target?: string;
  resolvedIp?: string | null;
  totalDurationMs?: number;
  accessible: boolean;
  banner?: string | null;
  error?: string;
  steps?: DiagnosticStep[];
}

/**
 * Execute a pre-flight reachability probe (DNS + TCP port handshake + banner grab).
 * Works natively on Android (via embedded Java WebSocket bridge) and on Desktop / Web.
 * Safely guards against non-JSON HTTP responses (e.g. <!doctype html>).
 */
export async function runDiagnosticProbe(
  host: string,
  port: number = 22,
  timeoutMs: number = 6000
): Promise<DiagnosticProbeResult> {
  const cleanHost = (host || '').trim();
  const cleanPort = Number(port) || 22;

  if (!cleanHost) {
    return {
      host: cleanHost,
      port: cleanPort,
      accessible: false,
      error: 'Host is required',
      steps: [],
      totalDurationMs: 0,
    };
  }

  // On Mobile (Capacitor/Android), always use the native WebSocket probe directly
  if (isMobileApp()) {
    return probeViaWebSocket(cleanHost, cleanPort, timeoutMs);
  }

  // On Desktop / Web, try HTTP first
  try {
    const httpUrl = getBackendHttpUrl('/api/diagnostics/probe');
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(httpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: cleanHost, port: cleanPort }),
      signal: controller.signal,
    });
    clearTimeout(timeoutTimer);

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return data as DiagnosticProbeResult;
    }

    // If server responded with non-JSON (e.g. index.html), fallback to WebSocket
    return probeViaWebSocket(cleanHost, cleanPort, timeoutMs);
  } catch {
    // On network error or abort, fallback to WebSocket
    return probeViaWebSocket(cleanHost, cleanPort, timeoutMs);
  }
}

/**
 * Probe target host and port via embedded WebSocket server.
 */
export function probeViaWebSocket(
  host: string,
  port: number,
  timeoutMs: number = 6000
): Promise<DiagnosticProbeResult> {
  return new Promise((resolve) => {
    const wsUrl = getBackendWsUrl('/ws/ssh');
    let ws: WebSocket | null = null;
    let finished = false;

    const cleanup = () => {
      if (finished) return;
      finished = true;
      if (ws) {
        try {
          ws.close();
        } catch {}
        ws = null;
      }
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve({
        host,
        port,
        accessible: false,
        error: `Diagnostic probe timed out after ${timeoutMs}ms`,
        steps: [
          {
            name: `TCP Handshake (Port ${port})`,
            step: `TCP Handshake (Port ${port})`,
            status: 'failure',
            details: `Probe timed out after ${timeoutMs}ms`,
          },
        ],
        totalDurationMs: timeoutMs,
      });
    }, timeoutMs);

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        try {
          ws?.send(JSON.stringify({ type: 'probe', host, port }));
        } catch (e: any) {
          clearTimeout(timer);
          cleanup();
          resolve({
            host,
            port,
            accessible: false,
            error: e?.message || 'Failed to send probe request',
            steps: [],
            totalDurationMs: 0,
          });
        }
      };

      ws.onmessage = (evt) => {
        try {
          const raw = typeof evt.data === 'string' ? evt.data : '';
          if (raw.startsWith('{') && raw.endsWith('}')) {
            const parsed = JSON.parse(raw);
            if (parsed.type === 'probe-result') {
              clearTimeout(timer);
              cleanup();
              resolve(parsed as DiagnosticProbeResult);
            }
          }
        } catch {
          // Non-JSON ignored
        }
      };

      ws.onerror = () => {
        clearTimeout(timer);
        cleanup();
        resolve({
          host,
          port,
          accessible: false,
          error: 'Local bridge WebSocket unavailable. Ensure bridge is running.',
          steps: [],
          totalDurationMs: 0,
        });
      };
    } catch (err: any) {
      clearTimeout(timer);
      cleanup();
      resolve({
        host,
        port,
        accessible: false,
        error: err?.message || 'WebSocket initialization failed',
        steps: [],
        totalDurationMs: 0,
      });
    }
  });
}

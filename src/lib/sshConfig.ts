import { Host, EnvironmentType } from '../types';

export interface ParsedSshHost {
  alias: string;
  hostname: string;
  user: string;
  port: number;
  identityFile?: string;
  proxyJump?: string;
  localForward?: string;
  comments: string[];
}

export function parseOpenSshConfig(rawConfig: string): ParsedSshHost[] {
  const lines = rawConfig.split('\n');
  const hosts: ParsedSshHost[] = [];
  let currentHost: ParsedSshHost | null = null;
  let currentComments: string[] = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('#')) {
      currentComments.push(trimmed.slice(1).trim());
      continue;
    }

    const tokens = trimmed.split(/\s+/);
    const key = tokens[0].toLowerCase();
    const value = tokens.slice(1).join(' ');

    if (key === 'host') {
      if (currentHost && currentHost.alias !== '*') {
        hosts.push(currentHost);
      }
      currentHost = {
        alias: value,
        hostname: value,
        user: 'root',
        port: 22,
        comments: [...currentComments],
      };
      currentComments = [];
    } else if (currentHost) {
      switch (key) {
        case 'hostname':
          currentHost.hostname = value;
          break;
        case 'user':
          currentHost.user = value;
          break;
        case 'port':
          currentHost.port = parseInt(value, 10) || 22;
          break;
        case 'identityfile':
          currentHost.identityFile = value;
          break;
        case 'proxyjump':
          currentHost.proxyJump = value;
          break;
        case 'localforward':
          currentHost.localForward = value;
          break;
      }
    }
  }

  if (currentHost && currentHost.alias !== '*') {
    hosts.push(currentHost);
  }

  return hosts;
}

export function exportToOpenSshConfig(hosts: Host[]): string {
  let output = `# ==========================================\n`;
  output += `# NexusTerm Exported SSH Configuration\n`;
  output += `# Generated: ${new Date().toISOString()}\n`;
  output += `# Hosts count: ${hosts.length}\n`;
  output += `# ==========================================\n\n`;

  for (const h of hosts) {
    output += `# Host: ${h.name} (${h.environment})\n`;
    if (h.description) {
      output += `# Description: ${h.description}\n`;
    }
    output += `Host ${h.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}\n`;
    output += `    HostName ${h.hostname}\n`;
    output += `    User ${h.username}\n`;
    if (h.port !== 22) {
      output += `    Port ${h.port}\n`;
    }
    if (h.proxyJumpChain && h.proxyJumpChain.length > 0) {
      output += `    # ProxyJump: ${h.proxyJumpChain.join(',')}\n`;
    }
    output += `    ServerAliveInterval 30\n`;
    output += `    ServerAliveCountMax 3\n\n`;
  }

  return output;
}

export const generateSshConfig = (hosts: Host[], _identities?: any[]): string =>
  exportToOpenSshConfig(hosts);

export function parseSshConfig(rawConfig: string): Host[] {
  const parsed = parseOpenSshConfig(rawConfig);
  return parsed.map((item, idx) => ({
    id: `imported-host-${Date.now()}-${idx}`,
    name: item.alias || item.hostname,
    hostname: item.hostname,
    port: item.port || 22,
    username: item.user || 'root',
    description: item.comments.join(' ') || 'Imported from ~/.ssh/config',
    environment: 'development',
    connectionType: 'ssh',
    tags: ['imported'],
    color: '#3b82f6',
    fingerprint: `SHA256:imported-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    favorite: false,
    status: 'unknown',
  }));
}

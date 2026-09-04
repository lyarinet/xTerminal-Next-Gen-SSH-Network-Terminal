import {
  Host,
  HostGroup,
  Identity,
  KnownHost,
  Snippet,
  PortForward,
  AuditEvent,
  AppSettings,
  VaultSettings,
  EnvironmentDef,
} from '../types';

export const DEFAULT_ENVIRONMENTS: EnvironmentDef[] = [
  { id: 'env-prod', name: 'production', color: '#10b981', description: 'Live production infrastructure', isDefault: true },
  { id: 'env-staging', name: 'staging', color: '#f59e0b', description: 'Pre-production staging cluster', isDefault: true },
  { id: 'env-dev', name: 'development', color: '#3b82f6', description: 'Local and remote dev servers', isDefault: true },
  { id: 'env-db', name: 'database', color: '#8b5cf6', description: 'Primary and replica databases', isDefault: true },
  { id: 'env-net', name: 'network', color: '#06b6d4', description: 'Routers, firewalls, and switches', isDefault: true },
  { id: 'env-lab', name: 'lab', color: '#ec4899', description: 'Testing, sandbox, and experimental', isDefault: true },
];

export const DEFAULT_GROUPS: HostGroup[] = [];
export const DEFAULT_IDENTITIES: Identity[] = [];
export const DEFAULT_HOSTS: Host[] = [];
export const DEFAULT_KNOWN_HOSTS: KnownHost[] = [];
export const DEFAULT_SNIPPETS: Snippet[] = [];
export const DEFAULT_PORT_FORWARDS: PortForward[] = [];
export const DEFAULT_AUDIT_EVENTS: AuditEvent[] = [];

export const DEFAULT_SETTINGS: AppSettings = {
  general: {
    restoreWorkspace: true,
    confirmDangerousActions: true,
    showNotifications: true,
  },
  terminal: {
    fontFamily: '"Fira Code", monospace',
    fontSize: 14,
    cursorStyle: 'block',
    cursorBlink: true,
    scrollbackLines: 5000,
    copyOnSelect: true,
  },
  ssh: {
    defaultPort: 22,
    timeoutSeconds: 15,
    keepaliveInterval: 30,
    enableCompression: true,
  },
};

export const DEFAULT_VAULT_SETTINGS: VaultSettings = {
  isLocked: false,
  hasMasterPassword: false,
  autoLockMinutes: 15,
  clipboardTimeoutSeconds: 20,
  lastUnlockedAt: undefined,
};

export const DEFAULT_TERMINAL_SETTINGS = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 13,
  cursorStyle: 'block' as const,
  cursorBlink: true,
  scrollbackLines: 5000,
  theme: 'one-dark' as const,
};

// Storage keys
const STORAGE_PREFIX = 'nexusterm_';

// Legacy mock ID prefixes to purge
const MOCK_ID_PATTERNS = [
  'host-prod-',
  'host-staging-',
  'host-cisco-',
  'host-bastion-',
  'grp-prod',
  'grp-staging',
  'grp-db',
  'grp-net',
  'id-ed25519-prod',
  'id-bastion-key',
  'id-dba-cert',
  'kh-1',
  'kh-2',
  'kh-3',
  'snip-',
  'pf-pg-tunnel',
  'pf-socks-bastion',
  'pf-redis-tunnel',
  'aud-1',
  'aud-2',
  'aud-3',
  'aud-4',
];

function isMockItem(item: any): boolean {
  if (!item || typeof item !== 'object') return false;
  const id = item.id || '';
  return MOCK_ID_PATTERNS.some((pattern) => id.startsWith(pattern) || id === pattern);
}

export function loadItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter((i) => !isMockItem(i)) as unknown as T;
      return cleaned;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

export function saveItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save ${key} to storage`, err);
  }
}

export const loadStoredHosts = () => loadItem<Host[]>('hosts', DEFAULT_HOSTS);
export const saveStoredHosts = (data: Host[]) => saveItem('hosts', data);

export const loadStoredGroups = () => loadItem<HostGroup[]>('groups', DEFAULT_GROUPS);
export const saveStoredGroups = (data: HostGroup[]) => saveItem('groups', data);

export const loadStoredIdentities = () => loadItem<Identity[]>('identities', DEFAULT_IDENTITIES);
export const saveStoredIdentities = (data: Identity[]) => saveItem('identities', data);

export const loadStoredSnippets = () => loadItem<Snippet[]>('snippets', DEFAULT_SNIPPETS);
export const saveStoredSnippets = (data: Snippet[]) => saveItem('snippets', data);

export const loadStoredPortForwards = () => loadItem<PortForward[]>('port_forwards', DEFAULT_PORT_FORWARDS);
export const saveStoredPortForwards = (data: PortForward[]) => saveItem('port_forwards', data);

export const loadStoredKnownHosts = () => loadItem<KnownHost[]>('known_hosts', DEFAULT_KNOWN_HOSTS);
export const saveStoredKnownHosts = (data: KnownHost[]) => saveItem('known_hosts', data);

export const loadStoredAuditEvents = () => loadItem<AuditEvent[]>('audit_events', DEFAULT_AUDIT_EVENTS);
export const saveStoredAuditEvents = (data: AuditEvent[]) => saveItem('audit_events', data);

export const loadStoredSettings = () => loadItem('terminal_settings', DEFAULT_TERMINAL_SETTINGS);
export const saveStoredSettings = (data: any) => saveItem('terminal_settings', data);

export const loadStoredVaultSettings = () => {
  const loaded = loadItem<VaultSettings>('vault_settings', DEFAULT_VAULT_SETTINGS);
  return loaded;
};
export const saveStoredVaultSettings = (data: VaultSettings) => saveItem('vault_settings', data);

export const loadStoredEnvironments = () => loadItem<EnvironmentDef[]>('environments', DEFAULT_ENVIRONMENTS);
export const saveStoredEnvironments = (data: EnvironmentDef[]) => saveItem('environments', data);

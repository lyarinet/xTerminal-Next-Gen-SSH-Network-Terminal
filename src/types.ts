export type EnvironmentType = 
  | 'production'
  | 'staging'
  | 'development'
  | 'lab'
  | 'database'
  | 'network'
  | 'cloud'
  | 'backup'
  | 'custom'
  | string;

export interface EnvironmentDef {
  id: string;
  name: string;
  color: string;
  description?: string;
  isDefault?: boolean;
}

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export type RiskLevel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ConnectionProtocol =
  | 'ssh'
  | 'sftp'
  | 'scp'
  | 'ftp'
  | 'ftps'
  | 'serial'
  | 'telnet'
  | 'mosh'
  | 'local'
  | 'docker'
  | 'k8s'
  | 'wsl'
  | 'remote_shell'
  | 'rdp'
  | 'vnc'
  | 'winbox';

export interface Host {
  id: string;
  name: string;
  hostname: string;
  port: number;
  username: string;
  description?: string;
  groupId?: string;
  tags: string[];
  color: string;
  icon?: string;
  environment: EnvironmentType;
  connectionType: ConnectionProtocol;
  identityId?: string;
  proxyJumpChain?: string[]; // IDs of jump hosts
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
  lastConnectedAt?: string;
  favorite: boolean;
  disabled?: boolean;
  notes?: string;
  status?: 'online' | 'offline' | 'unknown' | 'warning';
  startupCommand?: string;
  owner?: string;
  agentForwarding?: boolean;
  portForwardingRules?: string[];
  authType?: 'password' | 'key' | 'certificate' | 'agent' | 'yubikey';
  password?: string;
  savePassword?: boolean;
}

export interface HostGroup {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  environment?: EnvironmentType;
}

export type IdentityType = 'password' | 'private_key' | 'passphrase_key' | 'certificate' | 'agent' | 'fido2';

export interface Identity {
  id: string;
  name: string;
  type: IdentityType;
  username: string;
  keyType?: 'ed25519' | 'ecdsa' | 'rsa' | 'fido2';
  keyFingerprint?: string;
  fingerprint?: string;
  publicKey?: string;
  maskedSecret?: string;
  encryptedSecret?: string;
  encryptedPayload?: string;
  createdAt: string;
  updatedAt?: string;
  lastUsedAt?: string;
}

export interface KnownHost {
  id: string;
  hostname: string;
  ip: string;
  algorithm: string;
  fingerprint: string;
  expectedFingerprint?: string;
  firstSeen: string;
  lastSeen: string;
  status: 'trusted' | 'mismatch' | 'revoked';
}

export interface TerminalPane {
  id: string;
  hostId?: string;
  title: string;
  buffer: string[];
  currentInput?: string;
  commandHistory?: string[];
  history?: string[];
  historyIndex?: number;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
  active?: boolean;
}

export interface TerminalTab {
  id: string;
  title: string;
  hostId?: string;
  host?: Host;
  status?: 'connected' | 'connecting' | 'disconnected';
  connectionState?: ConnectionState;
  splitDirection?: 'none' | 'horizontal' | 'vertical';
  panes: TerminalPane[];
  activePaneId: string;
  createdAt: string;
  latencyMs?: number;
  bytesIn?: number;
  bytesOut?: number;
  uptimeSeconds?: number;
  multiplayerSessionId?: string;
  multiplayerParticipants?: MultiplayerParticipant[];
  multiplayerRole?: MultiplayerRole;
  isMultiplayerActive?: boolean;
}

export interface SftpEntry {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  isSymlink: boolean;
  modifiedTime: string;
  permissions: string;
  owner: string;
  group: string;
}

export interface TransferQueueItem {
  id: string;
  name: string;
  direction: 'upload' | 'download';
  localPath: string;
  remotePath: string;
  progress: number;
  size: number;
  transferredBytes: number;
  status: 'queued' | 'transferring' | 'completed' | 'failed' | 'cancelled';
  speed: string;
  eta: string;
}

export interface SnippetVariable {
  name: string;
  defaultValue: string;
  description: string;
}

export interface Snippet {
  id: string;
  name: string;
  description: string;
  command: string;
  category: string;
  tags: string[];
  variables: SnippetVariable[];
  riskLevel: RiskLevel;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PortForward {
  id: string;
  name: string;
  hostId: string;
  type: 'local' | 'remote' | 'dynamic';
  bindAddress: string;
  bindPort: number;
  targetHost: string;
  targetPort: number;
  status: 'active' | 'stopped' | 'error';
  autoStart: boolean;
  bytesTransferred: number;
  logs: string[];
  lastStarted?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  hostId?: string;
  hostName?: string;
  user?: string;
  command?: string;
  riskLevel?: RiskLevel;
  exitCode?: number;
}

export interface TerminalSettings {
  fontFamily: string;
  fontSize: number;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  scrollbackLines: number;
  theme: 'one-dark' | 'dracula' | 'tokyo-night' | 'monokai' | 'nord' | 'solarized-dark';
  alwaysOnTop?: boolean;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  user: string;
  cpu: number;
  mem: number;
  command: string;
  startTime: string;
}

export interface SystemdService {
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'failed';
  enabled: boolean;
  memory: string;
  uptime: string;
}

export interface ServerHealth {
  hostId: string;
  uptime: string;
  osDistribution: string;
  kernel: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  loadAverage: [number, number, number];
  rxSpeed: string;
  txSpeed: string;
  processes: ProcessInfo[];
  services: SystemdService[];
}

export interface VaultSettings {
  isLocked: boolean;
  hasMasterPassword: boolean;
  autoLockMinutes: number;
  clipboardTimeoutSeconds: number;
  lastUnlockedAt?: number;
}

export interface AppSettings {
  general: {
    restoreWorkspace: boolean;
    confirmDangerousActions: boolean;
    showNotifications: boolean;
  };
  terminal: {
    fontFamily: string;
    fontSize: number;
    cursorStyle: 'block' | 'underline' | 'bar';
    cursorBlink: boolean;
    scrollbackLines: number;
    copyOnSelect: boolean;
  };
  ssh: {
    defaultPort: number;
    timeoutSeconds: number;
    keepaliveInterval: number;
    enableCompression: boolean;
  };
}

export interface SerialPortConfig {
  portPath: string;
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd' | 'mark' | 'space';
  flowControl: 'none' | 'hardware' | 'software';
  dtr: boolean;
  rts: boolean;
}

export interface TftpStagedFile {
  name: string;
  size: number;
  type: 'firmware' | 'pxe' | 'config' | 'raw';
  description?: string;
  sha256?: string;
  updatedAt?: string;
  modified?: string;
}

export interface TftpTransferItem {
  id: string;
  fileName: string;
  clientIp: string;
  opcode: 'RRQ' | 'WRQ';
  blocksTransferred: number;
  bytesTransferred: number;
  status: 'active' | 'completed' | 'failed';
  rate: string;
}

export interface TftpServerLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  clientIp?: string;
  fileName?: string;
  opcode?: 'WRQ' | 'RRQ';
  bytes?: number;
}

export interface TftpServerActiveTransfer {
  id: string;
  clientKey: string;
  clientIp: string;
  clientPort: number;
  fileName: string;
  opcode: 'WRQ' | 'RRQ';
  blockSize: number;
  totalBytes: number;
  transferredBytes: number;
  percent: number;
  blocks: number;
  rate: string;
  status: 'active' | 'completed' | 'failed';
  startTime: number;
}

export interface PortScanResultItem {
  port: number;
  status: 'open' | 'closed' | 'filtered';
  latencyMs: number;
  service: string;
}

export interface PingPacketItem {
  seq: number;
  latencyMs: number;
  status: 'success' | 'timeout' | 'error';
}

export type AppThemeKey = 'dark' | 'midnight' | 'dracula' | 'nord' | 'one-dark' | 'light';

export interface PluginItem {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: 'protocol' | 'tool' | 'integration' | 'theme';
  icon: string;
  installed: boolean;
  enabled: boolean;
  downloads: number;
  rating: number;
  configSchema?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface RecordingEvent {
  timeMs: number;
  type: 'in' | 'out';
  data: string;
}

export interface SessionRecording {
  id: string;
  title: string;
  hostName: string;
  username: string;
  createdAt: string;
  durationSeconds: number;
  commandCount: number;
  events: RecordingEvent[];
}

export interface SshKeyItem {
  id: string;
  name: string;
  algorithm: 'ed25519' | 'rsa-4096' | 'ecdsa-p384';
  fingerprint: string;
  randomArt: string[];
  publicKey: string;
  comment: string;
  createdAt: string;
  isHardwareKey?: boolean;
  yubiKeySlot?: string;
  lastUsed?: string;
}

export interface MultiHostResult {
  hostId: string;
  hostName: string;
  environment: EnvironmentType;
  status: 'pending' | 'running' | 'success' | 'failed';
  exitCode: number;
  durationMs: number;
  output: string;
}

export interface MultiHostExecution {
  id: string;
  command: string;
  createdAt: string;
  targetHostIds: string[];
  results: MultiHostResult[];
}

export type MultiplayerRole = 'host' | 'controller' | 'participant' | 'viewer';
export type MultiplayerControlMode = 'one_controller' | 'host_only' | 'shared' | 'read_only';
export type MultiplayerAccessMode = 'link_only' | 'passcode' | 'approval_required' | 'open';

export interface MultiplayerParticipant {
  id: string;
  name: string;
  avatar: string;
  color: string;
  role: MultiplayerRole;
  isController: boolean;
  isTyping: boolean;
  cursorPosition?: { x: number; y: number };
  latencyMs?: number;
  isOnline: boolean;
  joinedAt: string;
}

export interface MultiplayerChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderColor: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface MultiplayerActivityEvent {
  id: string;
  timestamp: string;
  description: string;
  type: 'join' | 'leave' | 'control_request' | 'control_grant' | 'control_revoke' | 'system';
  userId?: string;
  userName?: string;
}

export interface MultiplayerSession {
  id: string; // e.g. XT-984210
  tabId: string;
  title: string;
  hostUserId: string;
  hostName: string;
  hostAvatar: string;
  controllerId: string;
  controlMode: MultiplayerControlMode;
  accessMode: MultiplayerAccessMode;
  passcode?: string;
  status: 'active' | 'paused' | 'ended';
  participants: MultiplayerParticipant[];
  createdAt: string;
  pendingRequests?: {
    userId: string;
    userName: string;
    userAvatar: string;
    requestedAt: string;
  }[];
  chatMessages?: MultiplayerChatMessage[];
  activityLog?: MultiplayerActivityEvent[];
  isDemo?: boolean;
}


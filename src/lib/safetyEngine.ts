import { RiskLevel } from '../types';

export interface CommandRiskAnalysis {
  riskLevel: RiskLevel;
  requiresTypedConfirmation: boolean;
  rationale: string;
  matchedRules: string[];
  suggestedAlternatives?: string[];
}

const CRITICAL_PATTERNS = [
  { pattern: /\brm\s+-[rfR]{1,4}\s+(\/|\*|~\/|\/\*)/i, reason: 'Recursive root or wildcard deletion destroys system files immediately' },
  { pattern: /\bmkfs(\.\w+)?\b/i, reason: 'Filesystem format operation will wipe existing partitions' },
  { pattern: /\bfdisk\b|\bparted\b|\bgdisk\b/i, reason: 'Partition table manipulation risks irreversible disk corruption' },
  { pattern: /\bdd\s+if=.*of=(\/dev\/[a-z0-9]+)/i, reason: 'Direct byte write to block device destroys storage structures' },
  { pattern: /\b(shutdown|reboot|poweroff|init\s+0|halt)\b/i, reason: 'System halt/reboot terminates active services and drops all connections' },
  { pattern: /\biptables\s+-F\b|\bufw\s+reset\b|\bnft\s+flush\b/i, reason: 'Firewall flush immediately drops network security controls' },
  { pattern: /\b(drop\s+database|drop\s+table\s+cascade)\b/i, reason: 'Destructive database drop will purge persistent records' },
  { pattern: /\bdocker\s+system\s+prune\s+(-a|--all)(\s+--force|-f)?\b/i, reason: 'Docker system prune deletes all unused images and volume data' },
  { pattern: /\bkubectl\s+delete\s+(ns|namespace|node|all)\b/i, reason: 'Kubernetes deletion removes entire cluster namespaces' },
  { pattern: />\s*(\/etc\/|\/boot\/|\/dev\/)/i, reason: 'Direct stream redirection into system directories can corrupt kernel or OS' },
];

const HIGH_PATTERNS = [
  { pattern: /\brm\s+-[rfR]{1,4}\b/i, reason: 'Recursive deletion removes directory trees permanently' },
  { pattern: /\bchmod\s+(-R\s+)?(777|000)\b/i, reason: 'Extreme permission changes leave files unprotected or inaccessible' },
  { pattern: /\bchown\s+-R\b/i, reason: 'Recursive ownership change can lock services out of application files' },
  { pattern: /\buserdel\s+(-r)?\b/i, reason: 'Deleting user account removes home directories and process permissions' },
  { pattern: /\bkill\s+-9\b|\bpkill\s+-9\b/i, reason: 'Force SIGKILL does not give processes time to flush buffers or exit cleanly' },
  { pattern: /\bsystemctl\s+(stop|disable)\b/i, reason: 'Stopping or disabling system daemon interrupts critical dependencies' },
  { pattern: /\bdocker\s+(rm\s+-f|stop|down)\b/i, reason: 'Stopping or removing containers terminates active workloads' },
  { pattern: /\bgit\s+reset\s+--hard\b/i, reason: 'Hard git reset discards uncommitted workspace edits' },
];

const MEDIUM_PATTERNS = [
  { pattern: /\bsystemctl\s+restart\b/i, reason: 'Service restart introduces temporary downtime' },
  { pattern: /\b(apt|apt-get|yum|dnf|apk)\s+(update|upgrade|install|remove)\b/i, reason: 'Package changes modify system packages and may restart daemons' },
  { pattern: /\bdocker\s+(run|restart|exec)\b/i, reason: 'Docker container lifecycle operation' },
  { pattern: /\b(chmod|chown)\b/i, reason: 'Permission adjustment' },
  { pattern: /\bkill\b|\bpkill\b/i, reason: 'Process termination signal' },
  { pattern: /\b(iptables|ufw|firewall-cmd)\b/i, reason: 'Network firewall configuration modification' },
];

const LOW_PATTERNS = [
  { pattern: /\b(systemctl\s+status|journalctl|docker\s+ps|docker\s+logs)\b/i, reason: 'Read-only status inspection' },
  { pattern: /\b(df|free|top|htop|vmstat|iostat|sar|netstat|ss|ip\s+a)\b/i, reason: 'Resource and diagnostic query' },
  { pattern: /\b(cat|less|grep|find|head|tail|wc)\b/i, reason: 'File inspection without side effects' },
];

const SAFE_PATTERNS = [
  { pattern: /^(pwd|whoami|uptime|date|uname\s+-a|hostname)$/i, reason: 'Zero-side-effect informational command' },
];

export function analyzeCommandRisk(command: string): CommandRiskAnalysis {
  const trimmed = command.trim();
  if (!trimmed) {
    return {
      riskLevel: 'SAFE',
      requiresTypedConfirmation: false,
      rationale: 'Empty command',
      matchedRules: [],
    };
  }

  // Check critical
  for (const item of CRITICAL_PATTERNS) {
    if (item.pattern.test(trimmed)) {
      return {
        riskLevel: 'CRITICAL',
        requiresTypedConfirmation: true,
        rationale: item.reason,
        matchedRules: [item.reason],
        suggestedAlternatives: [
          'Run a dry-run first if available (e.g. --dry-run)',
          'Verify target host and path before executing',
          'Create a backup of configuration files beforehand',
        ],
      };
    }
  }

  // Check high
  for (const item of HIGH_PATTERNS) {
    if (item.pattern.test(trimmed)) {
      return {
        riskLevel: 'HIGH',
        requiresTypedConfirmation: false,
        rationale: item.reason,
        matchedRules: [item.reason],
      };
    }
  }

  // Check medium
  for (const item of MEDIUM_PATTERNS) {
    if (item.pattern.test(trimmed)) {
      return {
        riskLevel: 'MEDIUM',
        requiresTypedConfirmation: false,
        rationale: item.reason,
        matchedRules: [item.reason],
      };
    }
  }

  // Check low
  for (const item of LOW_PATTERNS) {
    if (item.pattern.test(trimmed)) {
      return {
        riskLevel: 'LOW',
        requiresTypedConfirmation: false,
        rationale: item.reason,
        matchedRules: [item.reason],
      };
    }
  }

  // Check safe
  for (const item of SAFE_PATTERNS) {
    if (item.pattern.test(trimmed)) {
      return {
        riskLevel: 'SAFE',
        requiresTypedConfirmation: false,
        rationale: item.reason,
        matchedRules: [item.reason],
      };
    }
  }

  // Default heuristic: If it contains write redirects `>` or pipes to `sh`, mark as MEDIUM
  if (trimmed.includes('>') || trimmed.includes('| bash') || trimmed.includes('| sh')) {
    return {
      riskLevel: 'MEDIUM',
      requiresTypedConfirmation: false,
      rationale: 'Contains stream redirection or shell pipeline execution',
      matchedRules: ['Shell redirection/pipeline'],
    };
  }

  return {
    riskLevel: 'LOW',
    requiresTypedConfirmation: false,
    rationale: 'Standard command execution',
    matchedRules: ['Default policy'],
  };
}

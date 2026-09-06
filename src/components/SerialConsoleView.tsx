import React, { useState, useRef, useEffect } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import {
  Cpu,
  Play,
  Square,
  Trash2,
  Download,
  Send,
  Sliders,
  Terminal as TerminalIcon,
  Activity,
  Zap,
  Binary,
  Settings,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Share2,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Shield,
  X,
  RefreshCw,
} from 'lucide-react';
import { SerialPortConfig } from '../types';
import {
  SerialSettingsModal,
  SerialTerminalSettings,
  DEFAULT_SERIAL_SETTINGS,
} from './SerialSettingsModal';

interface SerialLogEntry {
  id: string;
  timestamp: string;
  direction: 'rx' | 'tx';
  text: string;
  hex: string;
}

export const SERIAL_THEMES: Record<string, any> = {
  nexus: {
    name: 'Nexus Obsidian',
    background: '#0A0A0B',
    foreground: '#E0E0E0',
    cursor: '#10B981',
    cursorAccent: '#0A0A0B',
    selectionBackground: '#10B98133',
    black: '#111112',
    red: '#EF4444',
    green: '#10B981',
    yellow: '#F59E0B',
    blue: '#3B82F6',
    magenta: '#A855F7',
    cyan: '#06B6D4',
    white: '#E5E7EB',
    brightBlack: '#4B5563',
    brightRed: '#F87171',
    brightGreen: '#34D399',
    brightYellow: '#FBBF24',
    brightBlue: '#60A5FA',
    brightMagenta: '#C084FC',
    brightCyan: '#22D3EE',
    brightWhite: '#F9FAFB',
  },
  greenPhosphor: {
    name: 'Vintage Green CRT',
    background: '#030D06',
    foreground: '#33FF66',
    cursor: '#33FF66',
    cursorAccent: '#030D06',
    selectionBackground: '#33FF6644',
    black: '#082010',
    red: '#FF5555',
    green: '#33FF66',
    yellow: '#FFDD33',
    blue: '#44AAFF',
    magenta: '#FF77DD',
    cyan: '#55FFEE',
    white: '#AAFFAA',
    brightBlack: '#184820',
    brightRed: '#FF8888',
    brightGreen: '#66FF88',
    brightYellow: '#FFEE66',
    brightBlue: '#77CCFF',
    brightMagenta: '#FFAAFF',
    brightCyan: '#88FFFF',
    brightWhite: '#DDFFDD',
  },
  amberCRT: {
    name: 'Vintage Amber CRT',
    background: '#0F0702',
    foreground: '#FFB000',
    cursor: '#FFB000',
    cursorAccent: '#0F0702',
    selectionBackground: '#FFB00044',
    black: '#241204',
    red: '#FF6644',
    green: '#DDAA00',
    yellow: '#FFCC00',
    blue: '#FF9900',
    magenta: '#FFAA44',
    cyan: '#FFDD88',
    white: '#FFE0AA',
    brightBlack: '#442208',
    brightRed: '#FF8866',
    brightGreen: '#FFCC33',
    brightYellow: '#FFEE44',
    brightBlue: '#FFBB44',
    brightMagenta: '#FFCC77',
    brightCyan: '#FFEEAA',
    brightWhite: '#FFF0CC',
  },
  dracula: {
    name: 'Dracula Dark',
    background: '#1E1F29',
    foreground: '#F8F8F2',
    cursor: '#50FA7B',
    cursorAccent: '#1E1F29',
    selectionBackground: '#44475A',
    black: '#21222C',
    red: '#FF5555',
    green: '#50FA7B',
    yellow: '#F1FA8C',
    blue: '#BD93F9',
    magenta: '#FF79C6',
    cyan: '#8BE9FD',
    white: '#F8F8F2',
    brightBlack: '#6272A4',
    brightRed: '#FF6E6E',
    brightGreen: '#69FF94',
    brightYellow: '#FFFFA5',
    brightBlue: '#D6ACFF',
    brightMagenta: '#FF92DF',
    brightCyan: '#A4FFFF',
    brightWhite: '#FFFFFF',
  },
  monokai: {
    name: 'Monokai Pro',
    background: '#272822',
    foreground: '#F8F8F2',
    cursor: '#F8F8F0',
    cursorAccent: '#272822',
    selectionBackground: '#49483E',
    black: '#272822',
    red: '#F92672',
    green: '#A6E22E',
    yellow: '#E6DB74',
    blue: '#66D9EF',
    magenta: '#AE81FF',
    cyan: '#A1EFE4',
    white: '#F8F8F2',
    brightBlack: '#75715E',
    brightRed: '#F92672',
    brightGreen: '#A6E22E',
    brightYellow: '#E6DB74',
    brightBlue: '#66D9EF',
    brightMagenta: '#AE81FF',
    brightCyan: '#A1EFE4',
    brightWhite: '#F9F8F5',
  },
};

export const SerialConsoleView: React.FC = () => {
  // Saved serial settings from localStorage or defaults
  const [serialSettings, setSerialSettings] = useState<SerialTerminalSettings>(() => {
    try {
      const saved = localStorage.getItem('nexusterm_serial_settings');
      if (saved) {
        return { ...DEFAULT_SERIAL_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_SERIAL_SETTINGS;
  });

  // Settings modal visibility
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Serial Port Configuration State
  const [config, setConfig] = useState<SerialPortConfig>({
    portPath: '/dev/ttyUSB0',
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    flowControl: 'none',
    dtr: true,
    rts: false,
  });

  const [isConnected, setIsConnected] = useState(false);
  const [isRealWebSerial, setIsRealWebSerial] = useState(false);
  const [displayView, setDisplayView] = useState<'terminal' | 'split' | 'hex'>('terminal');
  const [inputVal, setInputVal] = useState('');
  const [inputFormat, setInputFormat] = useState<'ascii' | 'hex'>('ascii');
  const [lineEnding, setLineEnding] = useState<'crlf' | 'lf' | 'cr' | 'none'>('crlf');
  const [hasWebSerial, setHasWebSerial] = useState(false);
  const [bytesRxCount, setBytesRxCount] = useState(0);
  const [bytesTxCount, setBytesTxCount] = useState(0);

  // Hardware Pin Indicators
  const [pinStates, setPinStates] = useState({
    cts: false,
    dsr: false,
    dcd: false,
    ri: false,
  });

  // Visual bell flash indicator state
  const [isBellFlashing, setIsBellFlashing] = useState(false);

  // Simulated / Real logs buffer for Hex and Inspector view
  const [logs, setLogs] = useState<SerialLogEntry[]>([]);

  // XTerm References
  const xtermContainerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const currentLineRef = useRef<string>('');
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef<number>(-1);

  // Web Serial Port References
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const writerRef = useRef<any>(null);

  // Remote Serial Bridge State
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [remoteSessionId, setRemoteSessionId] = useState<string | null>(null);
  const [remoteShareUrl, setRemoteShareUrl] = useState<string>('');
  const [remoteBaudRate, setRemoteBaudRate] = useState<number>(9600);
  const [remotePasscode, setRemotePasscode] = useState<string>('');
  const [isRemoteCreating, setIsRemoteCreating] = useState<boolean>(false);
  const [isRemoteBridged, setIsRemoteBridged] = useState<boolean>(false);
  const [remoteClientInfo, setRemoteClientInfo] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [remoteHostIp, setRemoteHostIp] = useState<string>(() => {
    return localStorage.getItem('nexusterm_serial_remote_ip') || '';
  });
  const [remoteHostPort, setRemoteHostPort] = useState<number>(() => {
    const saved = localStorage.getItem('nexusterm_serial_remote_port');
    return saved ? Number(saved) : 3000;
  });
  const [useHttps, setUseHttps] = useState<boolean>(true);
  const [detectedHostIps, setDetectedHostIps] = useState<Array<{ iface: string; address: string }>>([]);
  const remoteBridgeWsRef = useRef<WebSocket | null>(null);

  // Sync Remote Host IP from Settings & Config
  useEffect(() => {
    const savedIp = localStorage.getItem('nexusterm_serial_remote_ip');
    if (savedIp) {
      setRemoteHostIp(savedIp);
    }
    const savedPort = localStorage.getItem('nexusterm_serial_remote_port');
    if (savedPort) {
      setRemoteHostPort(Number(savedPort));
    }
    fetch('/api/system/network-info')
      .then((r) => r.json())
      .then((data) => {
        if (data.addresses && Array.isArray(data.addresses)) {
          setDetectedHostIps(data.addresses);
          if (!savedIp) {
            const primary = data.primaryIp || data.addresses[0]?.address || '127.0.0.1';
            setRemoteHostIp(primary);
            localStorage.setItem('nexusterm_serial_remote_ip', primary);
          }
        }
        if (data.port) {
          setRemoteHostPort(data.port);
        }
      })
      .catch(() => {});
  }, [showRemoteModal]);

  // Simulated GPIO state
  const gpioPinsRef = useRef<Record<number, boolean>>({
    0: true,
    2: false,
    4: true,
    5: false,
    12: true,
    13: true,
    14: false,
    15: false,
  });

  const promptStr = '\x1b[1;32mesp32-s3:/> \x1b[0m';

  // Persist settings changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nexusterm_serial_settings', JSON.stringify(serialSettings));
    } catch {}
  }, [serialSettings]);

  // Check Web Serial API support
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      setHasWebSerial(true);
    }
  }, []);

  // Keyboard shortcut (Alt+S) to open settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const stringToHex = (str: string): string => {
    return Array.from(str)
      .map((c) => c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))
      .join(' ');
  };

  const hexToString = (hex: string): string => {
    try {
      const clean = hex.replace(/[^0-9A-Fa-f]/g, '');
      let str = '';
      for (let i = 0; i < clean.length; i += 2) {
        str += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
      }
      return str;
    } catch {
      return '';
    }
  };

  // Setup and mount xterm.js instance
  useEffect(() => {
    if (!xtermContainerRef.current) return;

    const term = new XTerminal({
      cursorBlink: serialSettings.cursorBlink,
      cursorStyle: serialSettings.cursorStyle,
      fontFamily: serialSettings.fontFamily,
      fontSize: serialSettings.fontSize,
      lineHeight: serialSettings.lineHeight,
      theme: SERIAL_THEMES[serialSettings.theme] || SERIAL_THEMES.nexus,
      allowTransparency: true,
      convertEol: serialSettings.convertEol,
      scrollback: serialSettings.scrollbackLines,
      smoothScrollDuration: serialSettings.smoothScroll ? 120 : 0,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(xtermContainerRef.current);

    try {
      fitAddon.fit();
    } catch {
      // Ignored if hidden
    }

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Visual Bell handler
    term.onBell(() => {
      if (serialSettings.bellStyle === 'visual') {
        setIsBellFlashing(true);
        setTimeout(() => setIsBellFlashing(false), 200);
      }
    });

    // Welcome banner & Initial terminal display
    term.writeln('\x1b[1;32m╔══════════════════════════════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[1;32m║\x1b[0m \x1b[1;37mxTerminalx Serial TTY Console\x1b[0m  \x1b[90m(xterm.js Engine v6.0 / WebSerial)\x1b[0m \x1b[1;32m║\x1b[0m');
    term.writeln(`\x1b[1;32m║\x1b[0m \x1b[36mPort: ${config.portPath}\x1b[0m | \x1b[33mBaud: ${config.baudRate} 8N1\x1b[0m | \x1b[35mFlow: None\x1b[0m                   \x1b[1;32m║\x1b[0m`);
    term.writeln('\x1b[1;32m╚══════════════════════════════════════════════════════════════════╝\x1b[0m');
    term.writeln('\x1b[90m[UART INIT] RX Buffer: 4096B | TX FIFO: 2048B | Line Discipline: RAW TTY\x1b[0m');
    term.writeln('\x1b[32m[SYSTEM] Serial console ready. Press \x1b[1;37mAlt+S\x1b[0;32m or click \x1b[1;37mSettings\x1b[0;32m to configure.\x1b[0m\r\n');
    term.write(promptStr);

    // Keystroke handler for direct xterm.js keyboard input
    const dataListener = term.onData((data) => {
      // If connected to remote serial bridge via WebSocket
      if (remoteBridgeWsRef.current && remoteBridgeWsRef.current.readyState === WebSocket.OPEN) {
        try {
          remoteBridgeWsRef.current.send(JSON.stringify({
            type: 'serial:data',
            data,
          }));
          setBytesTxCount((prev) => prev + data.length);
          if (serialSettings.localEcho) {
            term.write(data === '\r' ? '\r\n' : data);
          }
          return;
        } catch (e) {
          console.error('Remote Serial Bridge write error:', e);
        }
      }

      // If connected to real Web Serial, forward directly to hardware with char pacing if configured
      if (writerRef.current) {
        try {
          const encoder = new TextEncoder();
          if (serialSettings.charDelayMs > 0 && data.length > 1) {
            let i = 0;
            const sendNext = () => {
              if (i < data.length && writerRef.current) {
                writerRef.current.write(encoder.encode(data[i]));
                i++;
                setTimeout(sendNext, serialSettings.charDelayMs);
              }
            };
            sendNext();
          } else {
            writerRef.current.write(encoder.encode(data));
          }
          setBytesTxCount((prev) => prev + data.length);
          if (serialSettings.localEcho) {
            term.write(data === '\r' ? '\r\n' : data);
          }
          return;
        } catch (e) {
          console.error('Web Serial write error:', e);
        }
      }

      // Simulated Hardware UART processing
      for (let i = 0; i < data.length; i++) {
        const char = data[i];

        if (char === '\r') {
          // ENTER pressed
          term.writeln('');
          const cmd = currentLineRef.current.trim();
          if (cmd) {
            historyRef.current.push(cmd);
            historyIdxRef.current = historyRef.current.length;
            executeSimulatedSerialCommand(cmd);
          } else {
            term.write(promptStr);
          }
          currentLineRef.current = '';
        } else if (char === '\x7f' || char === '\b') {
          // BACKSPACE
          if (currentLineRef.current.length > 0) {
            currentLineRef.current = currentLineRef.current.slice(0, -1);
            term.write('\b \b');
          }
        } else if (char === '\x03') {
          // Ctrl+C (Interrupt)
          term.writeln('^C');
          currentLineRef.current = '';
          term.write(promptStr);
        } else if (char === '\x04') {
          // Ctrl+D (EOF)
          term.writeln('^D (EOF)');
          term.write(promptStr);
        } else if (char === '\x0c') {
          // Ctrl+L (Clear screen)
          term.clear();
          term.write(promptStr + currentLineRef.current);
        } else if (data === '\x1b[A') {
          // Up Arrow (History Back)
          if (historyRef.current.length > 0 && historyIdxRef.current > 0) {
            historyIdxRef.current--;
            const prevCmd = historyRef.current[historyIdxRef.current];
            while (currentLineRef.current.length > 0) {
              term.write('\b \b');
              currentLineRef.current = currentLineRef.current.slice(0, -1);
            }
            term.write(prevCmd);
            currentLineRef.current = prevCmd;
          }
          break;
        } else if (data === '\x1b[B') {
          // Down Arrow (History Forward)
          if (historyIdxRef.current < historyRef.current.length - 1) {
            historyIdxRef.current++;
            const nextCmd = historyRef.current[historyIdxRef.current];
            while (currentLineRef.current.length > 0) {
              term.write('\b \b');
              currentLineRef.current = currentLineRef.current.slice(0, -1);
            }
            term.write(nextCmd);
            currentLineRef.current = nextCmd;
          } else {
            while (currentLineRef.current.length > 0) {
              term.write('\b \b');
              currentLineRef.current = currentLineRef.current.slice(0, -1);
            }
          }
          break;
        } else if (char.charCodeAt(0) >= 32) {
          // Regular printable character
          currentLineRef.current += char;
          term.write(char);
        }
      }
    });

    // ResizeObserver to adapt dynamically on window or panel size changes
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        // Ignored
      }
    });
    resizeObserver.observe(xtermContainerRef.current);

    return () => {
      dataListener.dispose();
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [displayView]);

  // Synchronize options when settings state changes
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = SERIAL_THEMES[serialSettings.theme] || SERIAL_THEMES.nexus;
      termRef.current.options.fontSize = serialSettings.fontSize;
      termRef.current.options.fontFamily = serialSettings.fontFamily;
      termRef.current.options.lineHeight = serialSettings.lineHeight;
      termRef.current.options.cursorStyle = serialSettings.cursorStyle;
      termRef.current.options.cursorBlink = serialSettings.cursorBlink;
      termRef.current.options.convertEol = serialSettings.convertEol;
      termRef.current.options.scrollback = serialSettings.scrollbackLines;
      fitAddonRef.current?.fit();
    }
  }, [serialSettings]);

  // Execute embedded microcontroller/router CLI commands
  const executeSimulatedSerialCommand = (cmdText: string) => {
    const rawCmd = cmdText.trim();
    const cmdUpper = rawCmd.toUpperCase();

    // Log the transmitted command in buffer
    const txEntry: SerialLogEntry = {
      id: `tx-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      direction: 'tx',
      text: `${rawCmd}\r\n`,
      hex: stringToHex(`${rawCmd}\r\n`),
    };
    setLogs((prev) => [...prev, txEntry]);
    setBytesTxCount((prev) => prev + rawCmd.length + 2);

    setTimeout(() => {
      let reply = '';
      const term = termRef.current;

      if (cmdUpper === 'AT') {
        reply = 'OK\r\n';
      } else if (cmdUpper === 'AT+GMR' || cmdUpper === 'VERSION') {
        reply = '+GMR: xTerminalx-ESP32-S3-UART-v2.4.0-PRO (IDF: v5.2-dirty)\r\n+BUILD: 2026-09-03T14:22:00Z\r\nOK\r\n';
      } else if (cmdUpper === 'HELP' || cmdUpper === '?') {
        reply =
          '\x1b[1;36m=== xTerminalx Microcontroller CLI Commands ===\x1b[0m\r\n' +
          '  \x1b[1;33mAT\x1b[0m              - Basic UART modem ping test\r\n' +
          '  \x1b[1;33mAT+GMR\x1b[0m          - Query firmware version & chip revision\r\n' +
          '  \x1b[1;33mSTATUS\x1b[0m          - Sensor telemetry, heap memory, CPU frequency\r\n' +
          '  \x1b[1;33mGPIO READ\x1b[0m       - Inspect digital IO pin voltages & levels\r\n' +
          '  \x1b[1;33mGPIO SET <p> <v>\x1b[0m- Set GPIO pin (e.g. gpio set 2 1)\r\n' +
          '  \x1b[1;33mWIFI SCAN\x1b[0m       - Perform 2.4/5GHz 802.11 b/g/n beacon discovery\r\n' +
          '  \x1b[1;33mI2C SCAN\x1b[0m        - 7-bit I2C bus scanner matrix\r\n' +
          '  \x1b[1;33mREBOOT\x1b[0m          - Perform software chip reset\r\n' +
          '  \x1b[1;33mCLEAR\x1b[0m           - Clear VT100 terminal screen\r\n' +
          '  \x1b[1;33mUNAME -A\x1b[0m        - OS kernel identity\r\n' +
          'OK\r\n';
      } else if (cmdUpper === 'STATUS') {
        reply =
          `\x1b[32m[TELEMETRY]\x1b[0m VCC: 3.32V | CORE_TEMP: 36.4°C | FREQ: 240MHz\r\n` +
          `\x1b[32m[MEMORY]\x1b[0m FREE_HEAP: 384,120 bytes | MIN_FREE: 312,040 bytes\r\n` +
          `\x1b[32m[UPTIME]\x1b[0m 1429.8 seconds | RESET_REASON: POWERON_RESET\r\n` +
          `OK\r\n`;
      } else if (cmdUpper === 'GPIO READ' || cmdUpper === 'GPIO') {
        reply =
          '\x1b[1;36mPIN  | MODE   | STATE | VOLTAGE\x1b[0m\r\n' +
          '-----+--------+-------+---------\r\n' +
          'IO0  | IN_PU  | HIGH  | 3.30V (BOOT)\r\n' +
          `IO2  | OUT_PP | ${gpioPinsRef.current[2] ? 'HIGH ' : 'LOW  '} | ${gpioPinsRef.current[2] ? '3.30V' : '0.01V'} (STATUS_LED)\r\n` +
          'IO4  | IN_PD  | HIGH  | 3.28V (EXT_INT)\r\n' +
          'IO5  | OUT_PP | LOW   | 0.02V (RELAY1)\r\n' +
          'IO12 | I2C_SCL| HIGH  | 3.30V (BUS)\r\n' +
          'IO13 | I2C_SDA| HIGH  | 3.30V (BUS)\r\n' +
          'OK\r\n';
      } else if (cmdUpper.startsWith('GPIO SET')) {
        const parts = rawCmd.split(/\s+/);
        const pin = parseInt(parts[2], 10);
        const val = parts[3] === '1' || parts[3]?.toUpperCase() === 'HIGH';
        if (!isNaN(pin)) {
          gpioPinsRef.current[pin] = val;
          reply = `\x1b[32m[GPIO]\x1b[0m Pin IO${pin} set to ${val ? 'HIGH (1)' : 'LOW (0)'}\r\nOK\r\n`;
        } else {
          reply = '\x1b[31m[ERROR]\x1b[0m Syntax: gpio set <pin_number> <0|1>\r\n';
        }
      } else if (cmdUpper === 'WIFI SCAN' || cmdUpper === 'AT+CWLAP') {
        reply =
          '\x1b[1;36mBSSID              | CH | RSSI  | AUTH     | SSID\x1b[0m\r\n' +
          '-------------------+----+-------+----------+---------------------\r\n' +
          '34:97:F6:28:11:A0  |  1 | -42dB | WPA2_PSK | Corp-Enterprise-5G\r\n' +
          'E4:5F:01:8A:2B:99  |  6 | -58dB | WPA3_SAE | IoT-Sensor-Mesh\r\n' +
          '70:3A:CB:44:91:02  | 11 | -74dB | WPA2_PSK | Guest-Hotspot\r\n' +
          'OK\r\n';
      } else if (cmdUpper === 'I2C SCAN') {
        reply =
          '\x1b[1;36mScanning I2C Bus 0 (SCL: IO12, SDA: IO13)...\x1b[0m\r\n' +
          '     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f\r\n' +
          '00:          -- -- -- -- -- -- -- -- -- -- -- -- --\r\n' +
          '10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --\r\n' +
          '20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --\r\n' +
          '30: -- -- -- -- -- -- -- -- -- -- -- -- \x1b[1;32m3c\x1b[0m -- -- --  (SSD1306 OLED)\r\n' +
          '40: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --\r\n' +
          '50: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --\r\n' +
          '60: -- -- -- -- -- -- -- -- \x1b[1;32m68\x1b[0m -- -- -- -- -- -- --  (MPU6050 Gyro)\r\n' +
          '70: -- -- -- -- -- -- -- --\r\n' +
          '\x1b[32m[OK]\x1b[0m Found 2 device(s) on bus.\r\n';
      } else if (cmdUpper === 'REBOOT' || cmdUpper === 'RESET') {
        term?.writeln('\x1b[33m[RESTART]\x1b[0m Performing soft hardware reboot in 500ms...');
        setTimeout(() => {
          term?.clear();
          term?.writeln('\x1b[1;31m[ROM-BOOT]\x1b[0m ESP32-S3 ROM bootloader v1.0.1');
          term?.writeln('\x1b[32m[FLASH]\x1b[0m Quad SPI Flash @ 80MHz verified.');
          term?.writeln('\x1b[32m[ENTRY]\x1b[0m Loaded user app partition at 0x10000.');
          term?.writeln(`\x1b[36m[INIT]\x1b[0m Console connected on ${config.portPath} @ ${config.baudRate} bps.\r\n`);
          term?.write(promptStr);
        }, 600);
        return;
      } else if (cmdUpper === 'CLEAR') {
        term?.clear();
        term?.write(promptStr);
        return;
      } else if (cmdUpper === 'UNAME -A') {
        reply = 'FreeRTOS v10.5.1 (ESP-IDF 5.2) xtensa-esp32s3-elf SMP #1 PREEMPT\r\n';
      } else {
        reply = `ECHO: ${rawCmd}\r\n`;
      }

      // Prepend timestamp if configured in settings
      let formattedReply = reply;
      if (serialSettings.showTimestamps) {
        const timePrefix = `\x1b[90m[${new Date().toLocaleTimeString()}]\x1b[0m `;
        formattedReply = timePrefix + reply;
      }

      // Write formatted reply to xterm.js
      if (term) {
        term.write(formattedReply);
        term.write(promptStr);
      }

      // Record RX entry
      const rxEntry: SerialLogEntry = {
        id: `rx-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        direction: 'rx',
        text: reply,
        hex: stringToHex(reply),
      };
      setLogs((prev) => [...prev, rxEntry]);
      setBytesRxCount((prev) => prev + reply.length);
    }, 120);
  };

  // Connect or disconnect serial port
  const handleConnect = async () => {
    if (isConnected) {
      if (remoteBridgeWsRef.current) {
        try { remoteBridgeWsRef.current.close(); } catch {}
        remoteBridgeWsRef.current = null;
        setIsRemoteBridged(false);
        setRemoteClientInfo(null);
      }
      // Close Web Serial if open
      if (readerRef.current) {
        try {
          await readerRef.current.cancel();
          readerRef.current.releaseLock();
        } catch {}
      }
      if (writerRef.current) {
        try {
          writerRef.current.releaseLock();
        } catch {}
      }
      if (portRef.current) {
        try {
          await portRef.current.close();
        } catch {}
      }
      portRef.current = null;
      readerRef.current = null;
      writerRef.current = null;

      setIsConnected(false);
      setIsRealWebSerial(false);
      termRef.current?.writeln(`\r\n\x1b[31m[DISCONNECTED]\x1b[0m Port ${config.portPath} closed.\r\n`);
      return;
    }

    // Attempt real Web Serial API if supported
    if (hasWebSerial && (navigator as any).serial) {
      try {
        const port = await (navigator as any).serial.requestPort();
        await port.open({
          baudRate: config.baudRate,
          dataBits: config.dataBits,
          stopBits: config.stopBits,
          parity: config.parity,
          flowControl: config.flowControl,
        });

        portRef.current = port;
        setIsConnected(true);
        setIsRealWebSerial(true);

        termRef.current?.writeln(
          `\r\n\x1b[32m[HARDWARE CONNECTED]\x1b[0m Web Serial attached to hardware port @ ${config.baudRate} bps.\r\n`
        );
        termRef.current?.write(promptStr);

        // Setup background reader
        const textDecoder = new TextDecoderStream();
        port.readable.pipeTo(textDecoder.writable);
        const reader = textDecoder.readable.getReader();
        readerRef.current = reader;

        const writer = port.writable.getWriter();
        writerRef.current = writer;

        // Read stream loop
        (async () => {
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value) {
                const outputVal = serialSettings.showTimestamps
                  ? `\x1b[90m[${new Date().toLocaleTimeString()}]\x1b[0m ${value}`
                  : value;
                termRef.current?.write(outputVal);
                setBytesRxCount((prev) => prev + value.length);
                setLogs((prev) => [
                  ...prev,
                  {
                    id: `rx-${Date.now()}`,
                    timestamp: new Date().toLocaleTimeString(),
                    direction: 'rx',
                    text: value,
                    hex: stringToHex(value),
                  },
                ]);
              }
            }
          } catch (e) {
            console.warn('Serial reader exited:', e);
            if (serialSettings.autoReconnect) {
              termRef.current?.writeln('\r\n\x1b[33m[RECONNECT]\x1b[0m Auto-reconnect triggered...\r\n');
            }
          }
        })();

        return;
      } catch (err) {
        console.warn('Web Serial prompt dismissed or restricted by iframe permissions, starting virtual TTY:', err);
      }
    }

    // Fallback: Virtual TTY session connection
    setIsConnected(true);
    setIsRealWebSerial(false);
    termRef.current?.writeln(
      `\r\n\x1b[32m[CONNECTED]\x1b[0m ${config.portPath} active @ ${config.baudRate} bps (${config.dataBits}${config.parity[0].toUpperCase()}${config.stopBits})\r\n`
    );
    termRef.current?.write(promptStr);
  };

  // Send input from the Quick Transmit Bar
  const handleSendFromBar = () => {
    if (!inputVal.trim()) return;

    let payloadText = inputVal;
    if (inputFormat === 'hex') {
      payloadText = hexToString(inputVal);
    } else {
      let suffix = '';
      if (lineEnding === 'crlf') suffix = '\r\n';
      else if (lineEnding === 'lf') suffix = '\n';
      else if (lineEnding === 'cr') suffix = '\r';
      payloadText = inputVal + suffix;
    }

    // If remote serial bridge is connected via WebSocket
    if (remoteBridgeWsRef.current && remoteBridgeWsRef.current.readyState === WebSocket.OPEN) {
      try {
        remoteBridgeWsRef.current.send(JSON.stringify({
          type: 'serial:data',
          data: payloadText,
        }));
        setBytesTxCount((prev) => prev + payloadText.length);
        if (serialSettings.localEcho) {
          termRef.current?.write(payloadText);
        }
        setInputVal('');
        return;
      } catch (e) {
        console.error('Remote Serial Bridge write error:', e);
      }
    }

    // If real Web Serial is connected
    if (writerRef.current) {
      try {
        const encoder = new TextEncoder();
        if (serialSettings.charDelayMs > 0 && payloadText.length > 1) {
          let idx = 0;
          const sendChar = () => {
            if (idx < payloadText.length && writerRef.current) {
              writerRef.current.write(encoder.encode(payloadText[idx]));
              idx++;
              setTimeout(sendChar, serialSettings.charDelayMs);
            }
          };
          sendChar();
        } else {
          writerRef.current.write(encoder.encode(payloadText));
        }

        setBytesTxCount((prev) => prev + payloadText.length);
        if (serialSettings.localEcho) {
          termRef.current?.write(payloadText);
        }
        setInputVal('');
        return;
      } catch (e) {
        console.error('Writer error:', e);
      }
    }

    // Run simulated execution
    executeSimulatedSerialCommand(inputVal.trim());
    setInputVal('');
  };

  // Quick Send Macro
  const handleSendMacro = (cmd: string) => {
    const fullCmd = cmd + '\r\n';
    if (remoteBridgeWsRef.current && remoteBridgeWsRef.current.readyState === WebSocket.OPEN) {
      remoteBridgeWsRef.current.send(JSON.stringify({
        type: 'serial:data',
        data: fullCmd,
      }));
      setBytesTxCount((prev) => prev + fullCmd.length);
      if (serialSettings.localEcho) {
        termRef.current?.write(fullCmd);
      }
      return;
    }
    if (termRef.current) {
      termRef.current.write(fullCmd);
    }
    executeSimulatedSerialCommand(cmd);
  };

  // Send Break signal
  const handleSendBreak = () => {
    if (remoteBridgeWsRef.current && remoteBridgeWsRef.current.readyState === WebSocket.OPEN) {
      remoteBridgeWsRef.current.send(JSON.stringify({
        type: 'serial:data',
        data: '\x03',
      }));
      termRef.current?.writeln('\r\n\x1b[33m[REMOTE BREAK]\x1b[0m <<< BREAK / INTERRUPT SENT TO REMOTE SWITCH >>>\r\n');
      return;
    }
    termRef.current?.writeln('\r\n\x1b[33m[SIGNAL]\x1b[0m <<< BREAK CONDITION SENT (250ms TX low) >>>\r\n');
    termRef.current?.write(promptStr);
  };

  // Generate & launch Remote Serial Bridge session
  const handleCreateRemoteSession = async () => {
    try {
      setIsRemoteCreating(true);
      const res = await fetch('/api/serial-bridge/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baudRate: remoteBaudRate,
          passcode: remotePasscode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Failed to initialize remote serial bridge');
        setIsRemoteCreating(false);
        return;
      }

      const rawHost = (remoteHostIp || localStorage.getItem('nexusterm_serial_remote_ip') || window.location.hostname).trim();
      const targetHost = rawHost.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
      const isLocal = targetHost === 'localhost' || targetHost === '127.0.0.1';
      const isDomain = !isLocal && !/^(\d{1,3}\.){3}\d{1,3}$/.test(targetHost);
      const proto = (useHttps && !isLocal) ? 'https:' : (window.location.protocol === 'https:' ? 'https:' : 'http:');
      
      // When a domain is used (e.g. Nginx Proxy Manager / Cloudflare), NPM listens on standard 443/80
      let portPart = '';
      if (isDomain) {
        if (remoteHostPort && remoteHostPort !== 80 && remoteHostPort !== 443 && remoteHostPort !== 3000 && remoteHostPort !== 3443) {
          portPart = `:${remoteHostPort}`;
        }
      } else {
        const port = (useHttps && !isLocal) ? '3443' : (remoteHostPort || '3000');
        portPart = port ? `:${port}` : '';
      }
      const shareUrl = `${proto}//${targetHost}${portPart}${data.sharePath}`;
      setRemoteShareUrl(shareUrl);
      setRemoteSessionId(data.session.id);

      // Connect Engineer WebSocket
      if (remoteBridgeWsRef.current) {
        try { remoteBridgeWsRef.current.close(); } catch {}
      }

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/serial-bridge`;
      const ws = new WebSocket(wsUrl);
      remoteBridgeWsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'join',
          sessionId: data.session.id,
          role: 'engineer',
          passcode: remotePasscode.trim() || undefined,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'client:connected') {
            setIsRemoteBridged(true);
            setRemoteClientInfo(msg.portInfo || 'USB Console Adapter');
            setIsConnected(true);
            termRef.current?.writeln(
              `\r\n\x1b[1;32m[REMOTE CONSOLE ATTACHED]\x1b[0m Client plugged in console cable (${msg.portInfo || 'USB Serial'}).`
            );
            termRef.current?.writeln(
              `\x1b[36m[TUNNEL LIVE]\x1b[0m Bi-directional remote switch console active @ ${msg.baudRate || remoteBaudRate} bps.\r\n`
            );
          } else if (msg.type === 'client:disconnected') {
            setIsRemoteBridged(false);
            setRemoteClientInfo(null);
            termRef.current?.writeln(
              `\r\n\x1b[1;33m[REMOTE CLIENT DETACHED]\x1b[0m Client disconnected or cable was detached.\r\n`
            );
          } else if (msg.type === 'serial:data') {
            if (msg.data) {
              const outputVal = serialSettings.showTimestamps
                ? `\x1b[90m[${new Date().toLocaleTimeString()}]\x1b[0m ${msg.data}`
                : msg.data;
              termRef.current?.write(outputVal);
              setBytesRxCount((prev) => prev + msg.data.length);
              setLogs((prev) => [
                ...prev,
                {
                  id: `rx-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  direction: 'rx',
                  text: msg.data,
                  hex: stringToHex(msg.data),
                },
              ]);
            }
          }
        } catch (err) {
          console.error('Remote WS message error:', err);
        }
      };

      ws.onclose = () => {
        setIsRemoteBridged(false);
        setRemoteClientInfo(null);
      };

      termRef.current?.writeln(
        `\r\n\x1b[1;36m[REMOTE BRIDGE INITIALIZED]\x1b[0m Session: ${data.session.id}. Send URL to client.`
      );

      setIsRemoteCreating(false);
    } catch (err: any) {
      console.error('Create remote serial error:', err);
      alert('Error creating remote session: ' + err.message);
      setIsRemoteCreating(false);
    }
  };

  // Close Remote Serial Bridge session
  const handleCloseRemoteSession = async () => {
    if (remoteSessionId) {
      try {
        await fetch(`/api/serial-bridge/session/${remoteSessionId}`, { method: 'DELETE' });
      } catch {}
    }
    if (remoteBridgeWsRef.current) {
      try { remoteBridgeWsRef.current.close(); } catch {}
      remoteBridgeWsRef.current = null;
    }
    setRemoteSessionId(null);
    setRemoteShareUrl('');
    setIsRemoteBridged(false);
    setRemoteClientInfo(null);
    termRef.current?.writeln(`\r\n\x1b[31m[REMOTE SESSION CLOSED]\x1b[0m Remote serial tunnel terminated.\r\n`);
  };

  // Copy link helper
  const handleCopyLink = () => {
    if (!remoteShareUrl) return;
    navigator.clipboard.writeText(remoteShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Clear Terminal Output
  const handleClearTerminal = () => {
    termRef.current?.clear();
    setLogs([]);
    termRef.current?.write(promptStr);
  };

  // Export Log File
  const handleExportLog = () => {
    const textData = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.direction.toUpperCase()}] ${
            l.text.replace(/\r/g, '').replace(/\n/g, ' ')
          } | HEX: ${l.hex}`
      )
      .join('\n');
    const blob = new Blob([textData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial-${config.portPath.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full bg-[#0A0A0B] text-[#E0E0E0] overflow-hidden font-sans transition-all ${
        isBellFlashing ? 'ring-4 ring-amber-500/50' : ''
      }`}
    >
      {/* Top Configuration & Hardware Header */}
      <div className="bg-[#111112] border-b border-[#222224] p-4 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">Serial TTY Console</h1>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold flex items-center gap-1.5 border ${
                    isConnected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-[#1C1C1E] text-gray-400 border-[#222224]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                    }`}
                  />
                  {isConnected
                    ? isRealWebSerial
                      ? 'WEB SERIAL (HARDWARE)'
                      : 'TTY SIMULATOR (ACTIVE)'
                    : 'PORT CLOSED'}
                </span>

                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  xterm.js
                </span>

                {serialSettings.charDelayMs > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    Pacing {serialSettings.charDelayMs}ms
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Hardware COM &amp; FTDI UART terminal emulation, live ANSI colors, pacing control &amp; HEX protocol analysis.
              </p>
            </div>
          </div>

          {/* Quick Hardware Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleConnect}
              className={`px-4 py-2 rounded-md font-bold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
                isConnected
                  ? 'bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black'
              }`}
            >
              {isConnected ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Close Port</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Open Port</span>
                </>
              )}
            </button>

            {/* Remote Serial Bridge URL Button */}
            <button
              onClick={() => setShowRemoteModal(true)}
              className={`px-3 py-2 rounded-md font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                isRemoteBridged
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                  : remoteSessionId
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-[#1C1C1E] hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border border-sky-500/30'
              }`}
              title="Share Remote Serial Console URL with Client (WebSerial over IP)"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>
                {isRemoteBridged
                  ? 'Remote Console Live'
                  : remoteSessionId
                  ? 'Waiting Client...'
                  : 'Remote Client URL'}
              </span>
            </button>

            <button
              onClick={handleSendBreak}
              disabled={!isConnected}
              className="px-2.5 py-2 rounded-md bg-[#1C1C1E] hover:bg-[#252528] disabled:opacity-40 text-amber-400 hover:text-amber-300 border border-[#222224] text-xs font-mono font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              title="Send Break Signal"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>BREAK</span>
            </button>

            <button
              onClick={handleClearTerminal}
              className="p-2 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-400 hover:text-white border border-[#222224] transition-colors cursor-pointer"
              title="Clear Terminal Screen & Logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportLog}
              className="p-2 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-400 hover:text-white border border-[#222224] transition-colors cursor-pointer"
              title="Export Log File"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Prominent Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-2 rounded-md bg-[#1C1C1E] hover:bg-[#252528] text-gray-200 hover:text-white border border-[#222224] hover:border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer group"
              title="Configure Serial Console & xterm.js Settings (Alt+S)"
            >
              <Settings className="w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform duration-300" />
              <span>Settings</span>
              <kbd className="hidden sm:inline-block text-[9px] px-1.5 py-0.2 rounded bg-black/40 text-gray-400 border border-[#2b2b2e] font-mono">
                Alt+S
              </kbd>
            </button>
          </div>
        </div>

        {/* Port Configuration Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 mt-3 pt-3 border-t border-[#222224] text-xs">
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-semibold block mb-1">Port</label>
            <select
              value={config.portPath}
              disabled={isConnected}
              onChange={(e) => setConfig({ ...config, portPath: e.target.value })}
              className="w-full px-2 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-gray-200 font-mono text-xs focus:outline-hidden disabled:opacity-50"
            >
              <option value="/dev/ttyUSB0">/dev/ttyUSB0 (FTDI)</option>
              <option value="/dev/ttyACM0">/dev/ttyACM0 (CDC-ACM)</option>
              <option value="COM1">COM1 (Motherboard)</option>
              <option value="COM3">COM3 (CP2102)</option>
              <option value="COM4">COM4 (CH340)</option>
              <option value="/dev/cu.usbserial">/dev/cu.usbserial (macOS)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase font-semibold block mb-1">Baud Rate</label>
            <select
              value={config.baudRate}
              disabled={isConnected}
              onChange={(e) => setConfig({ ...config, baudRate: Number(e.target.value) })}
              className="w-full px-2 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-gray-200 font-mono text-xs focus:outline-hidden disabled:opacity-50"
            >
              <option value={9600}>9600</option>
              <option value={19200}>19200</option>
              <option value={38400}>38400</option>
              <option value={57600}>57600</option>
              <option value={74880}>74880 (ESP Boot)</option>
              <option value={115200}>115200 (Std ESP/ARM)</option>
              <option value={230400}>230400</option>
              <option value={250000}>250000 (3D Printer)</option>
              <option value={460800}>460800</option>
              <option value={921600}>921600</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase font-semibold block mb-1">Data Bits</label>
            <select
              value={config.dataBits}
              disabled={isConnected}
              onChange={(e) => setConfig({ ...config, dataBits: Number(e.target.value) as 7 | 8 })}
              className="w-full px-2 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-gray-200 font-mono text-xs focus:outline-hidden disabled:opacity-50"
            >
              <option value={8}>8 bits</option>
              <option value={7}>7 bits</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase font-semibold block mb-1">Parity</label>
            <select
              value={config.parity}
              disabled={isConnected}
              onChange={(e) => setConfig({ ...config, parity: e.target.value as any })}
              className="w-full px-2 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-gray-200 font-mono text-xs focus:outline-hidden disabled:opacity-50"
            >
              <option value="none">None (N)</option>
              <option value="even">Even (E)</option>
              <option value="odd">Odd (O)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase font-semibold block mb-1">Stop Bits</label>
            <select
              value={config.stopBits}
              disabled={isConnected}
              onChange={(e) => setConfig({ ...config, stopBits: Number(e.target.value) as 1 | 2 })}
              className="w-full px-2 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-gray-200 font-mono text-xs focus:outline-hidden disabled:opacity-50"
            >
              <option value={1}>1 stop bit</option>
              <option value={2}>2 stop bits</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase font-semibold block mb-1">Flow Control</label>
            <select
              value={config.flowControl}
              disabled={isConnected}
              onChange={(e) => setConfig({ ...config, flowControl: e.target.value as any })}
              className="w-full px-2 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-gray-200 font-mono text-xs focus:outline-hidden disabled:opacity-50"
            >
              <option value="none">None</option>
              <option value="hardware">RTS / CTS</option>
              <option value="software">XON / XOFF</option>
            </select>
          </div>
        </div>

        {/* Signals & Layout Controls */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#222224]/70 text-xs flex-wrap gap-3">
          {/* Pins Status & Output toggles */}
          <div className="flex items-center gap-2.5 font-mono text-[11px] flex-wrap">
            <span className="text-gray-500 text-[10px] uppercase font-semibold">Signals:</span>

            <button
              onClick={() => setConfig({ ...config, dtr: !config.dtr })}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                config.dtr
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold'
                  : 'bg-[#1C1C1E] text-gray-500 border-[#222224]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${config.dtr ? 'bg-emerald-400' : 'bg-gray-600'}`} />
              DTR
            </button>

            <button
              onClick={() => setConfig({ ...config, rts: !config.rts })}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                config.rts
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold'
                  : 'bg-[#1C1C1E] text-gray-500 border-[#222224]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${config.rts ? 'bg-emerald-400' : 'bg-gray-600'}`} />
              RTS
            </button>

            <div className="flex items-center gap-2 text-gray-400 border-l border-[#222224] pl-2.5">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${pinStates.cts ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                CTS
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${pinStates.dsr ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                DSR
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${pinStates.dcd ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                DCD
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${pinStates.ri ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                RI
              </span>
            </div>

            {/* Traffic metrics */}
            <div className="flex items-center gap-2 border-l border-[#222224] pl-2.5 text-[10px] text-gray-400">
              <span className="text-emerald-400 font-mono">RX: {bytesRxCount} B</span>
              <span className="text-gray-500">|</span>
              <span className="text-blue-400 font-mono">TX: {bytesTxCount} B</span>
            </div>
          </div>

          {/* View Mode & xterm Settings */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Display View Tabs */}
            <div className="flex items-center bg-[#1C1C1E] p-0.5 rounded-md border border-[#222224] text-[11px] font-mono">
              <button
                onClick={() => setDisplayView('terminal')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                  displayView === 'terminal'
                    ? 'bg-[#111112] text-emerald-400 font-bold shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <TerminalIcon className="w-3 h-3" />
                <span>xterm.js</span>
              </button>
              <button
                onClick={() => setDisplayView('split')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                  displayView === 'split'
                    ? 'bg-[#111112] text-emerald-400 font-bold shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>Split (Term + Hex)</span>
              </button>
              <button
                onClick={() => setDisplayView('hex')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
                  displayView === 'hex'
                    ? 'bg-[#111112] text-emerald-400 font-bold shadow-xs'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Binary className="w-3 h-3" />
                <span>Hex Inspector</span>
              </button>
            </div>

            {/* Terminal Theme Selector */}
            <select
              value={serialSettings.theme}
              onChange={(e) => setSerialSettings({ ...serialSettings, theme: e.target.value })}
              className="px-2 py-1 rounded bg-[#1C1C1E] border border-[#222224] text-[11px] font-mono text-gray-300 focus:outline-hidden"
            >
              {Object.entries(SERIAL_THEMES).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Local Echo Toggle */}
            <button
              onClick={() => setSerialSettings({ ...serialSettings, localEcho: !serialSettings.localEcho })}
              className={`px-2 py-1 rounded border text-[10px] font-mono transition-colors cursor-pointer ${
                serialSettings.localEcho
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold'
                  : 'bg-[#1C1C1E] text-gray-400 border-[#222224]'
              }`}
              title="Toggle local terminal echo for typed characters"
            >
              Echo: {serialSettings.localEcho ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Terminal Display Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* xterm.js Terminal Container */}
        <div
          className={`h-full flex flex-col min-w-0 ${
            displayView === 'terminal'
              ? 'w-full'
              : displayView === 'split'
              ? 'w-full lg:w-3/5 border-r border-[#222224]'
              : 'hidden'
          }`}
        >
          <div
            ref={xtermContainerRef}
            className="flex-1 w-full h-full p-2 bg-[#0A0A0B] overflow-hidden focus:outline-hidden"
          />
        </div>

        {/* HEX Packet Stream & Frame Inspector */}
        <div
          className={`h-full flex flex-col bg-[#0E0E10] overflow-hidden ${
            displayView === 'hex'
              ? 'w-full'
              : displayView === 'split'
              ? 'hidden lg:flex lg:w-2/5'
              : 'hidden'
          }`}
        >
          <div className="p-3 border-b border-[#222224] bg-[#141416] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Binary className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-white">Raw UART Stream &amp; Hex Dump</span>
            </div>
            <span className="text-[10px] font-mono text-gray-500">{logs.length} packet frames</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs select-text">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <Binary className="w-6 h-6 stroke-1 text-gray-600 mb-1" />
                <p className="text-[11px]">No UART packets recorded yet.</p>
              </div>
            ) : (
              logs.map((l) => (
                <div
                  key={l.id}
                  className={`p-2 rounded border text-[11px] ${
                    l.direction === 'tx'
                      ? 'bg-emerald-950/10 border-emerald-900/30 text-emerald-300'
                      : 'bg-[#18181A] border-[#222224] text-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 text-[10px]">
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                        l.direction === 'tx'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-cyan-500/20 text-cyan-400'
                      }`}
                    >
                      {l.direction}
                    </span>
                    <span className="text-gray-500">{l.timestamp}</span>
                  </div>
                  <div className="text-gray-400 break-all mb-1">{l.text}</div>
                  <div className="text-emerald-400/80 text-[10px] tracking-wider break-all bg-[#0A0A0B] p-1.5 rounded border border-[#222224]/60">
                    {l.hex}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Macro Pills Strip */}
      <div className="px-3 py-1.5 bg-[#0E0E10] border-t border-[#222224] flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono shrink-0">
        <span className="text-gray-500 text-[10px] uppercase font-bold shrink-0 mr-1">Macros:</span>
        {serialSettings.macros.map((macro) => (
          <button
            key={macro.id}
            onClick={() => handleSendMacro(macro.cmd)}
            title={macro.description || macro.cmd}
            className="px-2 py-0.5 rounded bg-[#18181A] hover:bg-emerald-500/20 hover:text-emerald-400 text-gray-300 border border-[#222224] hover:border-emerald-500/30 transition-colors whitespace-nowrap cursor-pointer"
          >
            {macro.label}
          </button>
        ))}

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="px-2 py-0.5 rounded bg-transparent hover:bg-[#18181A] text-gray-500 hover:text-gray-300 text-[10px] font-sans flex items-center gap-1 border border-dashed border-[#28282b] transition-colors cursor-pointer"
          title="Configure Macros in Settings"
        >
          <Plus className="w-2.5 h-2.5" />
          <span>Edit Macros</span>
        </button>
      </div>

      {/* Interactive Transmit Bar */}
      <div className="p-3 bg-[#111112] border-t border-[#222224] flex items-center gap-2 shrink-0">
        <select
          value={inputFormat}
          onChange={(e) => setInputFormat(e.target.value as 'ascii' | 'hex')}
          className="px-2 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-300 font-mono focus:outline-hidden"
        >
          <option value="ascii">ASCII</option>
          <option value="hex">HEX</option>
        </select>

        <select
          value={lineEnding}
          onChange={(e) => setLineEnding(e.target.value as any)}
          disabled={inputFormat === 'hex'}
          className="px-2 py-1.5 rounded bg-[#1C1C1E] border border-[#222224] text-xs text-gray-300 font-mono focus:outline-hidden disabled:opacity-40"
        >
          <option value="crlf">CR+LF (\r\n)</option>
          <option value="lf">LF (\n)</option>
          <option value="cr">CR (\r)</option>
          <option value="none">No Ending</option>
        </select>

        <div className="relative flex-1">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendFromBar()}
            placeholder={
              inputFormat === 'hex'
                ? 'Enter hex bytes (e.g. 41 54 0D 0A or 02 AA FF)'
                : 'Type command string (or type directly in xterm canvas above)...'
            }
            className="w-full px-3 py-1.5 rounded-md bg-[#1C1C1E] border border-[#222224] text-xs text-white font-mono placeholder-gray-500 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <button
          onClick={handleSendFromBar}
          disabled={!inputVal.trim()}
          className="px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </div>

      {/* Comprehensive Serial Console Settings Modal */}
      <SerialSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={serialSettings}
        config={config}
        themes={SERIAL_THEMES}
        onSaveSettings={(newSettings, newConfig) => {
          setSerialSettings(newSettings);
          if (newConfig) {
            setConfig((prev) => ({ ...prev, ...newConfig }));
          }
          if (newSettings.defaultLineEnding) {
            setLineEnding(newSettings.defaultLineEnding);
          }
          if (newSettings.defaultInputFormat) {
            setInputFormat(newSettings.defaultInputFormat);
          }
        }}
      />

      {/* Remote Serial Console Bridge Modal */}
      {showRemoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-[#121316] border border-[#2A2B30] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#222226] flex items-center justify-between bg-gradient-to-r from-sky-500/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Remote Client Serial URL
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">WebSerial over IP</span>
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Client plugs console cable into switch; you get live console access
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRemoteModal(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-[#1E1F24] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Status Indicator */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#18191D] border border-[#24252A]">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isRemoteBridged
                        ? 'bg-emerald-400 animate-pulse ring-4 ring-emerald-400/20'
                        : remoteSessionId
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-gray-500'
                    }`}
                  />
                  <span className="font-medium text-gray-200">
                    {isRemoteBridged
                      ? `Client Connected (${remoteClientInfo || 'Switch Console'})`
                      : remoteSessionId
                      ? 'Waiting for client to open URL and plug cable...'
                      : 'No Active Remote Session'}
                  </span>
                </div>
                {remoteSessionId && (
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                    {remoteBaudRate} 8N1
                  </span>
                )}
              </div>

              {!remoteSessionId ? (
                /* Configuration Form */
                <div className="space-y-3">
                  {/* Assigned Host IP from Settings & Config */}
                  <div className="p-3 rounded-lg bg-[#18191D] border border-[#24252A] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-gray-200 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-sky-400" />
                        Host IP for Remote URL:
                      </label>
                      <span className="text-[10px] text-gray-400 font-mono">
                        (Synced with Settings &amp; Config)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {detectedHostIps.length > 0 ? (
                        <select
                          value={remoteHostIp}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRemoteHostIp(val);
                            localStorage.setItem('nexusterm_serial_remote_ip', val);
                          }}
                          className="flex-1 px-3 py-1.5 rounded-md bg-[#121316] border border-[#2A2B30] text-emerald-400 font-mono text-xs focus:outline-hidden focus:border-sky-500"
                        >
                          {detectedHostIps.map((net) => (
                            <option key={net.address} value={net.address}>
                              {net.address} ({net.iface})
                            </option>
                          ))}
                          <option value="127.0.0.1">127.0.0.1 (Localhost)</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={remoteHostIp}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRemoteHostIp(val);
                            localStorage.setItem('nexusterm_serial_remote_ip', val);
                          }}
                          placeholder="e.g. 192.168.1.38"
                          className="flex-1 px-3 py-1.5 rounded-md bg-[#121316] border border-[#2A2B30] text-emerald-400 font-mono text-xs focus:outline-hidden focus:border-sky-500"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          fetch('/api/system/network-info')
                            .then((r) => r.json())
                            .then((d) => {
                              if (d.addresses) setDetectedHostIps(d.addresses);
                              if (d.primaryIp && !remoteHostIp) {
                                setRemoteHostIp(d.primaryIp);
                                localStorage.setItem('nexusterm_serial_remote_ip', d.primaryIp);
                              }
                            })
                            .catch(() => {});
                        }}
                        className="px-2.5 py-1.5 rounded-md bg-[#1C1C20] hover:bg-[#25252A] text-sky-400 border border-sky-500/30 text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                        title="Re-detect PC IPs"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Detect</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#222226]">
                      <span className="text-[11px] text-gray-300 font-medium">Protocol:</span>
                      <div className="inline-flex rounded-md p-0.5 bg-[#121316] border border-[#2A2B30]">
                        <button
                          type="button"
                          onClick={() => setUseHttps(true)}
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded cursor-pointer transition-colors ${
                            useHttps
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          🔒 HTTPS :3443 (Recommended)
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseHttps(false)}
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded cursor-pointer transition-colors ${
                            !useHttps
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          HTTP :3000
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-400 flex items-center justify-between">
                      <span>Target Base:</span>
                      <span className="text-sky-300 font-mono font-semibold">
                        {(() => {
                          const host = (remoteHostIp || '127.0.0.1').trim();
                          const isLoc = host === 'localhost' || host === '127.0.0.1';
                          const isDom = !isLoc && !/^(\d{1,3}\.){3}\d{1,3}$/.test(host);
                          const p = (useHttps && !isLoc) ? 'https' : 'http';
                          if (isDom) {
                            return `${p}://${host}`;
                          }
                          return `${p}://${host}:${(useHttps && !isLoc) ? '3443' : remoteHostPort}`;
                        })()}
                      </span>
                    </div>

                    {remoteHostIp && !['localhost', '127.0.0.1'].includes(remoteHostIp) && !/^(\d{1,3}\.){3}\d{1,3}$/.test(remoteHostIp) && (
                      <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-300 flex items-center justify-between">
                        <span>✨ Nginx Proxy Manager Mode (Standard Port 443)</span>
                        <span className="font-mono text-[9px] text-purple-200">Forward Port: 3000</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-300 mb-1">
                      Console Baud Rate (Switch / Router default)
                    </label>
                    <select
                      value={remoteBaudRate}
                      onChange={(e) => setRemoteBaudRate(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-md bg-[#18191D] border border-[#26272C] text-gray-200 font-mono text-xs focus:outline-hidden focus:border-sky-500"
                    >
                      <option value={9600}>9600 bps (Standard Cisco / Huawei / HP)</option>
                      <option value={115200}>115200 bps (MikroTik / Juniper / Fortinet)</option>
                      <option value={57600}>57600 bps</option>
                      <option value={38400}>38400 bps</option>
                      <option value={19200}>19200 bps</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-300 mb-1">
                      Session Passcode (Optional)
                    </label>
                    <div className="relative">
                      <Shield className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        value={remotePasscode}
                        onChange={(e) => setRemotePasscode(e.target.value)}
                        placeholder="Leave blank for open client access"
                        className="w-full pl-9 pr-3 py-2 rounded-md bg-[#18191D] border border-[#26272C] text-gray-200 font-mono text-xs focus:outline-hidden focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      How this works:
                    </p>
                    <p className="text-[11px] text-sky-200/80">
                      1. You click "Generate Shareable Link" below.<br />
                      2. Send the link to the client via WhatsApp, Slack, or Email.<br />
                      3. Client opens it in Chrome/Edge, plugs in console cable, and clicks "Connect".<br />
                      4. Switch console prompt appears directly in your xTerminal!
                    </p>
                  </div>

                  <button
                    onClick={handleCreateRemoteSession}
                    disabled={isRemoteCreating}
                    className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Link2 className="w-4 h-4" />
                    <span>{isRemoteCreating ? 'Generating URL...' : 'Generate Shareable Client URL'}</span>
                  </button>
                </div>
              ) : (
                /* Active Session Details */
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-300 mb-1">
                      Share this URL with your Client:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={remoteShareUrl}
                        className="w-full px-3 py-2 rounded-md bg-[#0F1013] border border-[#26272C] text-cyan-400 font-mono text-xs select-all"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-3 py-2 rounded-md bg-[#1C1C20] hover:bg-[#25252A] text-gray-200 border border-[#2A2B30] flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
                        title="Copy Link"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={remoteShareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 rounded-md bg-[#1C1C20] hover:bg-[#25252A] text-sky-400 border border-sky-500/20 text-center font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Test / Open Client Portal</span>
                    </a>

                    <button
                      onClick={handleCloseRemoteSession}
                      className="px-4 py-2 rounded-md bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>End Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#222226] bg-[#0E0F12] flex items-center justify-between text-[11px] text-gray-400">
              <span>Zero client installation &bull; WebSerial 2.0</span>
              <button
                onClick={() => setShowRemoteModal(false)}
                className="px-3 py-1 rounded bg-[#1C1C20] hover:bg-[#25252A] text-gray-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

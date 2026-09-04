import {
  MultiplayerSession,
  MultiplayerParticipant,
  MultiplayerChatMessage,
  MultiplayerActivityEvent
} from '../../types';

export interface DemoSimulatorCallbacks {
  onUpdateSession: (updater: (prev: MultiplayerSession) => MultiplayerSession) => void;
  onTerminalWrite: (chunk: string) => void;
  onCursorMove?: (cursor: { x: number; y: number }, isTyping: boolean) => void;
}

export class MultiplayerDemoSimulator {
  private active = false;
  private timeouts: any[] = [];
  private callbacks: DemoSimulatorCallbacks;

  constructor(callbacks: DemoSimulatorCallbacks) {
    this.callbacks = callbacks;
  }

  public startDemo(baseSession: MultiplayerSession) {
    this.stopDemo();
    this.active = true;

    const stan: MultiplayerParticipant = {
      id: 'stan-demo',
      name: 'Stan',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      color: '#38bdf8',
      role: 'participant',
      isController: false,
      isTyping: false,
      latencyMs: 14,
      isOnline: true,
      joinedAt: new Date().toISOString(),
    };

    const sarah: MultiplayerParticipant = {
      id: 'sarah-demo',
      name: 'Sarah',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      color: '#f59e0b',
      role: 'viewer',
      isController: false,
      isTyping: false,
      latencyMs: 22,
      isOnline: true,
      joinedAt: new Date().toISOString(),
    };

    // Step 1: Add Stan & Sarah to the session
    this.callbacks.onUpdateSession((prev) => ({
      ...prev,
      isDemo: true,
      participants: [
        ...prev.participants.filter((p) => p.id !== stan.id && p.id !== sarah.id),
        stan,
        sarah,
      ],
      activityLog: [
        {
          id: `demo-act-${Date.now()}-1`,
          timestamp: new Date().toISOString(),
          description: 'Stan joined the session',
          type: 'join',
          userId: stan.id,
          userName: stan.name,
        },
        {
          id: `demo-act-${Date.now()}-2`,
          timestamp: new Date().toISOString(),
          description: 'Sarah joined the session as Viewer',
          type: 'join',
          userId: sarah.id,
          userName: sarah.name,
        },
        ...(prev.activityLog || []),
      ],
    }));

    // Step 2: Sarah says hello in chat (after 1s)
    this.schedule(() => {
      this.callbacks.onUpdateSession((prev) => ({
        ...prev,
        chatMessages: [
          ...(prev.chatMessages || []),
          {
            id: `msg-${Date.now()}`,
            senderId: sarah.id,
            senderName: sarah.name,
            senderAvatar: sarah.avatar,
            senderColor: sarah.color,
            text: 'Hey team! Joining to observe server diagnostics.',
            timestamp: new Date().toISOString(),
          },
        ],
      }));
    }, 1200);

    // Step 3: Stan explains problem & requests control (after 2.5s)
    this.schedule(() => {
      this.callbacks.onUpdateSession((prev) => ({
        ...prev,
        pendingRequests: [
          ...(prev.pendingRequests || []).filter((r) => r.userId !== stan.id),
          {
            userId: stan.id,
            userName: stan.name,
            userAvatar: stan.avatar,
            requestedAt: new Date().toISOString(),
          },
        ],
        chatMessages: [
          ...(prev.chatMessages || []),
          {
            id: `msg-${Date.now()}`,
            senderId: stan.id,
            senderName: stan.name,
            senderAvatar: stan.avatar,
            senderColor: stan.color,
            text: 'I can inspect the socket listeners on port 8082. Requesting terminal control.',
            timestamp: new Date().toISOString(),
          },
        ],
        activityLog: [
          {
            id: `demo-act-${Date.now()}-3`,
            timestamp: new Date().toISOString(),
            description: 'Stan requested terminal control',
            type: 'control_request',
            userId: stan.id,
            userName: stan.name,
          },
          ...(prev.activityLog || []),
        ],
      }));
    }, 2800);
  }

  public simulateStanTyping() {
    if (!this.active) return;

    const command = 'sudo netstat -tulpn | grep 8082';
    let charIndex = 0;
    const startX = 24; // typical prompt length
    const startY = 12;

    this.callbacks.onTerminalWrite('\r\n\x1b[32mstan@serverauditor\x1b[0m:\x1b[34m~\x1b[0m# ');

    const typeNextChar = () => {
      if (!this.active) return;
      if (charIndex < command.length) {
        const char = command[charIndex];
        this.callbacks.onTerminalWrite(char);

        // Update cursor coordinate and typing status
        if (this.callbacks.onCursorMove) {
          this.callbacks.onCursorMove({ x: startX + charIndex, y: startY }, true);
        }

        charIndex++;
        const delay = Math.floor(Math.random() * 40) + 60; // 60-100ms realistic typing
        this.schedule(typeNextChar, delay);
      } else {
        // Command typed, press Enter
        this.schedule(() => {
          if (!this.active) return;
          this.callbacks.onTerminalWrite('\r\n');
          if (this.callbacks.onCursorMove) {
            this.callbacks.onCursorMove({ x: 0, y: startY + 1 }, false);
          }

          // Execution output
          this.schedule(() => {
            if (!this.active) return;
            this.callbacks.onTerminalWrite(
              'tcp        0      0 0.0.0.0:8082            0.0.0.0:*               LISTEN      14820/node          \r\n' +
              'tcp6       0      0 :::8082                 :::*                    LISTEN      14820/node          \r\n' +
              '\x1b[32mstan@serverauditor\x1b[0m:\x1b[34m~\x1b[0m# '
            );

            // Stan comments in chat
            this.schedule(() => {
              if (!this.active) return;
              this.callbacks.onUpdateSession((prev) => ({
                ...prev,
                chatMessages: [
                  ...(prev.chatMessages || []),
                  {
                    id: `msg-${Date.now()}`,
                    senderId: 'stan-demo',
                    senderName: 'Stan',
                    senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
                    senderColor: '#38bdf8',
                    text: 'Process 14820 is actively listening on port 8082 with clean recv/send queues. All good! Passing control back.',
                    timestamp: new Date().toISOString(),
                  },
                ],
              }));

              // Stan releases control back
              this.schedule(() => {
                if (!this.active) return;
                this.callbacks.onUpdateSession((prev) => ({
                  ...prev,
                  controllerId: prev.hostUserId,
                  participants: prev.participants.map((p) => ({
                    ...p,
                    isController: p.id === prev.hostUserId,
                    role: p.id === prev.hostUserId ? 'host' : (p.id === 'stan-demo' ? 'participant' : p.role),
                  })),
                  activityLog: [
                    {
                      id: `demo-act-${Date.now()}-done`,
                      timestamp: new Date().toISOString(),
                      description: 'Stan released terminal control back to Host',
                      type: 'control_revoke',
                      userId: 'stan-demo',
                      userName: 'Stan',
                    },
                    ...(prev.activityLog || []),
                  ],
                }));
              }, 2000);
            }, 1000);
          }, 300);
        }, 400);
      }
    };

    this.schedule(typeNextChar, 300);
  }

  public stopDemo() {
    this.active = false;
    this.timeouts.forEach((t) => clearTimeout(t));
    this.timeouts = [];
  }

  private schedule(fn: () => void, delayMs: number) {
    if (!this.active) return;
    const t = setTimeout(fn, delayMs);
    this.timeouts.push(t);
  }
}

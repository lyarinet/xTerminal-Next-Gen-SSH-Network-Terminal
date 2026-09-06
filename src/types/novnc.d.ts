declare module '@novnc/novnc' {
  export interface NoVncCredentials {
    username?: string;
    password?: string;
    target?: string;
  }

  export interface NoVncOptions {
    shared?: boolean;
    credentials?: NoVncCredentials;
    repeaterID?: string;
    wsProtocols?: string[];
  }

  export default class RFB extends EventTarget {
    constructor(target: HTMLElement, url: string, options?: NoVncOptions);
    viewOnly: boolean;
    scaleViewport: boolean;
    resizeSession: boolean;
    clipViewport: boolean;
    dragViewport: boolean;
    focusOnClick: boolean;
    showDotCursor: boolean;
    background: string;
    disconnect(): void;
    sendCredentials(credentials: NoVncCredentials): void;
    sendCtrlAltDel(): void;
    clipboardPasteFrom(text: string): void;
    sendKey(keysym: number, code: string, down?: boolean): void;
  }
}

package com.lyarinet.xterminal;

import android.content.Context;
import android.util.Log;

import com.jcraft.jsch.ChannelShell;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * AndroidLocalBridge
 *
 * Embedded native WebSocket server running on 127.0.0.1:3000 inside the Android app.
 * Provides direct, standalone SSH, Telnet, and local Android terminal shell (/system/bin/sh)
 * capabilities without requiring an external PC or manual IP configuration.
 */
public class AndroidLocalBridge {
    private static final String TAG = "AndroidLocalBridge";
    public static final int DEFAULT_PORT = 3000;

    private static volatile AndroidLocalBridge sInstance;

    private Context mAppContext;
    private BridgeWebSocketServer mServer;
    private int mPort = DEFAULT_PORT;
    private boolean mIsRunning = false;

    private final Map<WebSocket, ClientSession> mSessions = new ConcurrentHashMap<>();
    private final ExecutorService mThreadPool = Executors.newCachedThreadPool();

    public static AndroidLocalBridge getInstance() {
        if (sInstance == null) {
            synchronized (AndroidLocalBridge.class) {
                if (sInstance == null) {
                    sInstance = new AndroidLocalBridge();
                }
            }
        }
        return sInstance;
    }

    private AndroidLocalBridge() {}

    /**
     * Start the native embedded bridge on 127.0.0.1:port
     */
    public synchronized void startBridge(Context context, int port) {
        if (mIsRunning) {
            Log.i(TAG, "Bridge is already running on port " + mPort);
            return;
        }

        mAppContext = context != null ? context.getApplicationContext() : null;
        mPort = port > 0 ? port : DEFAULT_PORT;

        try {
            InetSocketAddress address = new InetSocketAddress("127.0.0.1", mPort);
            mServer = new BridgeWebSocketServer(address);
            mServer.setReuseAddr(true);
            mServer.setTcpNoDelay(true);
            mServer.start();
            mIsRunning = true;
            Log.i(TAG, "xTerminal Standalone Native Bridge started on 127.0.0.1:" + mPort);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start BridgeWebSocketServer: " + e.getMessage(), e);
            mIsRunning = false;
        }
    }

    /**
     * Stop the bridge and cleanly close all active sessions.
     */
    public synchronized void stopBridge() {
        if (!mIsRunning || mServer == null) {
            return;
        }

        Log.i(TAG, "Stopping xTerminal Native Bridge...");

        for (Map.Entry<WebSocket, ClientSession> entry : mSessions.entrySet()) {
            try {
                entry.getValue().close();
                if (entry.getKey().isOpen()) {
                    entry.getKey().close();
                }
            } catch (Exception ignored) {}
        }
        mSessions.clear();

        try {
            mServer.stop(1000);
        } catch (Exception e) {
            Log.w(TAG, "Error stopping WebSocketServer: " + e.getMessage());
        }

        mServer = null;
        mIsRunning = false;
        Log.i(TAG, "xTerminal Standalone Native Bridge stopped.");
    }

    public boolean isRunning() {
        return mIsRunning;
    }

    // ---------------------------------------------------------------------------------------------
    // WebSocket Server Implementation
    // ---------------------------------------------------------------------------------------------

    private class BridgeWebSocketServer extends WebSocketServer {

        public BridgeWebSocketServer(InetSocketAddress address) {
            super(address);
        }

        @Override
        public void onStart() {
            Log.i(TAG, "WebSocket server ready and listening on " + getAddress());
        }

        @Override
        public void onOpen(WebSocket conn, ClientHandshake handshake) {
            Log.i(TAG, "Client connected: " + conn.getRemoteSocketAddress() + " resource: " + handshake.getResourceDescriptor());
            ClientSession session = new ClientSession(conn);
            mSessions.put(conn, session);
        }

        @Override
        public void onClose(WebSocket conn, int code, String reason, boolean remote) {
            Log.i(TAG, "Client disconnected: " + conn.getRemoteSocketAddress() + " code=" + code + " reason=" + reason);
            ClientSession session = mSessions.remove(conn);
            if (session != null) {
                session.close();
            }
        }

        @Override
        public void onError(WebSocket conn, Exception ex) {
            Log.e(TAG, "WebSocket error: " + (ex != null ? ex.getMessage() : "unknown"), ex);
            if (conn != null) {
                ClientSession session = mSessions.remove(conn);
                if (session != null) {
                    session.close();
                }
            }
        }

        @Override
        public void onMessage(WebSocket conn, String message) {
            ClientSession session = mSessions.get(conn);
            if (session == null) return;

            // 1. Password input capture mode
            if (session.isEnteringPassword) {
                handlePasswordInput(session, message);
                return;
            }

            // 2. JSON control / handshake messages
            if (message.startsWith("{") && message.endsWith("}")) {
                try {
                    JSONObject data = new JSONObject(message);
                    String type = data.optString("type", "");

                    if ("init".equals(type)) {
                        session.hostParams = data;
                        String protocol = data.optString("protocol", "ssh");
                        int port = data.optInt("port", 22);

                        if ("telnet".equalsIgnoreCase(protocol) || port == 23) {
                            startTelnetConnection(session, data);
                        } else {
                            startSshConnection(session, data.optString("password", null));
                        }
                        return;
                    }

                    if ("init-local".equals(type)) {
                        startLocalShell(session, data);
                        return;
                    }

                    if ("resize".equals(type)) {
                        int cols = data.optInt("cols", 80);
                        int rows = data.optInt("rows", 24);
                        session.handleResize(cols, rows);
                        return;
                    }

                    if ("probe".equals(type)) {
                        handleProbeRequest(session, data);
                        return;
                    }
                } catch (Exception ignored) {
                    // Not JSON control, fall through to raw stream data
                }
            }

            // 3. Local shell input vs SSH/Telnet raw stream input
            if (session.isLocalShell) {
                handleLocalShellInput(session, message);
                return;
            }

            // 4. Raw user terminal keystrokes for SSH / Telnet
            session.writeInput(message.getBytes(StandardCharsets.UTF_8));
        }

        @Override
        public void onMessage(WebSocket conn, ByteBuffer bytes) {
            ClientSession session = mSessions.get(conn);
            if (session == null) return;

            if (session.isLocalShell) {
                byte[] b = new byte[bytes.remaining()];
                bytes.get(b);
                handleLocalShellInput(session, new String(b, StandardCharsets.UTF_8));
                return;
            }

            byte[] b = new byte[bytes.remaining()];
            bytes.get(b);
            session.writeInput(b);
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Pre-flight Reachability Probe (TCP & DNS)
    // ---------------------------------------------------------------------------------------------

    private void handleProbeRequest(ClientSession session, JSONObject data) {
        String host = data.optString("host", "").trim();
        int port = data.optInt("port", 22);

        mThreadPool.execute(() -> {
            long startTime = System.currentTimeMillis();
            JSONObject result = new JSONObject();
            JSONArray steps = new JSONArray();
            String resolvedIp = "";
            String banner = "";

            try {
                result.put("type", "probe-result");
                result.put("host", host);
                result.put("port", port);

                if (host.isEmpty()) {
                    result.put("accessible", false);
                    result.put("error", "Host is required");
                    result.put("steps", steps);
                    result.put("totalDurationMs", 0);
                    send(session.ws, result.toString());
                    return;
                }

                // Step 1: DNS Resolution
                long dnsStart = System.currentTimeMillis();
                JSONObject dnsStep = new JSONObject();
                dnsStep.put("step", "DNS Resolution");
                dnsStep.put("name", "DNS Resolution");

                try {
                    InetAddress address = InetAddress.getByName(host);
                    resolvedIp = address.getHostAddress();
                    long dnsDuration = Math.max(1, System.currentTimeMillis() - dnsStart);
                    dnsStep.put("status", "success");
                    dnsStep.put("durationMs", dnsDuration);
                    dnsStep.put("details", "Resolved to " + resolvedIp);
                } catch (Exception e) {
                    long dnsDuration = Math.max(1, System.currentTimeMillis() - dnsStart);
                    dnsStep.put("status", "failure");
                    dnsStep.put("durationMs", dnsDuration);
                    dnsStep.put("details", "DNS resolution failed: " + e.getMessage());
                    steps.put(dnsStep);
                    result.put("accessible", false);
                    result.put("steps", steps);
                    result.put("totalDurationMs", System.currentTimeMillis() - startTime);
                    result.put("error", "DNS resolution failed: " + e.getMessage());
                    send(session.ws, result.toString());
                    return;
                }
                steps.put(dnsStep);

                // Step 2: TCP Handshake
                long tcpStart = System.currentTimeMillis();
                JSONObject tcpStep = new JSONObject();
                tcpStep.put("step", "TCP Handshake (Port " + port + ")");
                tcpStep.put("name", "TCP Handshake (Port " + port + ")");

                try (Socket socket = new Socket()) {
                    socket.connect(new InetSocketAddress(resolvedIp, port), 4000);
                    socket.setSoTimeout(1500);

                    // Try reading banner (especially useful for SSH/Telnet)
                    try {
                        byte[] buffer = new byte[256];
                        InputStream in = socket.getInputStream();
                        int read = in.read(buffer);
                        if (read > 0) {
                            banner = new String(buffer, 0, read, StandardCharsets.UTF_8).trim();
                        }
                    } catch (Exception ignored) {
                        // Banner read timeout is fine (some protocols wait for client)
                    }

                    long tcpDuration = Math.max(1, System.currentTimeMillis() - tcpStart);
                    tcpStep.put("status", "success");
                    tcpStep.put("durationMs", tcpDuration);
                    String details = "TCP Handshake successful (" + tcpDuration + "ms)";
                    if (!banner.isEmpty()) {
                        details += " [Banner: " + banner + "]";
                    }
                    tcpStep.put("details", details);
                } catch (Exception e) {
                    long tcpDuration = Math.max(1, System.currentTimeMillis() - tcpStart);
                    tcpStep.put("status", "failure");
                    tcpStep.put("durationMs", tcpDuration);
                    tcpStep.put("details", "TCP Handshake failed: " + e.getMessage());
                    steps.put(tcpStep);
                    result.put("accessible", false);
                    result.put("steps", steps);
                    result.put("totalDurationMs", System.currentTimeMillis() - startTime);
                    result.put("error", "TCP Handshake failed: " + e.getMessage());
                    send(session.ws, result.toString());
                    return;
                }
                steps.put(tcpStep);

                result.put("accessible", true);
                result.put("resolvedIp", resolvedIp);
                result.put("banner", banner);
                result.put("steps", steps);
                result.put("totalDurationMs", Math.max(1, System.currentTimeMillis() - startTime));

                send(session.ws, result.toString());
            } catch (Exception ex) {
                Log.e(TAG, "Probe error: " + ex.getMessage());
                try {
                    result.put("accessible", false);
                    result.put("error", ex.getMessage());
                    result.put("steps", steps);
                    result.put("totalDurationMs", Math.max(1, System.currentTimeMillis() - startTime));
                    send(session.ws, result.toString());
                } catch (Exception ignored) {}
            }
        });
    }

    // ---------------------------------------------------------------------------------------------
    // Interactive Password Input Handling
    // ---------------------------------------------------------------------------------------------

    private void handlePasswordInput(ClientSession session, String str) {
        for (int i = 0; i < str.length(); i++) {
            char ch = str.charAt(i);
            if (ch == '\r' || ch == '\n') {
                send(session.ws, "\r\n");
                session.isEnteringPassword = false;
                String inputPw = session.passwordBuffer.toString();
                session.passwordBuffer = new StringBuilder();
                startSshConnection(session, inputPw);
                return;
            } else if (ch == '\u007F' || ch == '\b') {
                if (session.passwordBuffer.length() > 0) {
                    session.passwordBuffer.setLength(session.passwordBuffer.length() - 1);
                    send(session.ws, "\b \b");
                }
            } else if (ch == '\u0003') { // Ctrl+C
                session.isEnteringPassword = false;
                session.passwordBuffer = new StringBuilder();
                send(session.ws, "^C\r\n\u001b[90m[Connection cancelled]\u001b[0m\r\n");
                session.ws.close();
                return;
            } else if (ch >= 32) {
                session.passwordBuffer.append(ch);
                send(session.ws, "*");
            }
        }
    }

    // ---------------------------------------------------------------------------------------------
    // SSH Session (via MWiede JSch - modern ciphers & key exchange support)
    // ---------------------------------------------------------------------------------------------

    private void startSshConnection(ClientSession session, String inputPassword) {
        session.streamPool.execute(() -> {
            try {
                JSONObject params = session.hostParams;
                if (params == null) {
                    send(session.ws, "\r\n\u001b[31m[xTerminal] Error: Missing connection parameters.\u001b[0m\r\n");
                    session.ws.close();
                    return;
                }

                String host = params.optString("host", "127.0.0.1");
                int port = params.optInt("port", 22);
                String username = params.optString("username", "root");
                String password = inputPassword != null ? inputPassword : params.optString("password", "");
                String privateKey = params.optString("privateKey", "");
                String passphrase = params.optString("passphrase", "");
                int cols = Math.max(10, params.optInt("cols", 80));
                int rows = Math.max(5, params.optInt("rows", 24));

                // If password not provided and no private key, prompt interactively
                if ((password == null || password.isEmpty()) && (privateKey == null || privateKey.trim().isEmpty())) {
                    session.isEnteringPassword = true;
                    session.passwordBuffer = new StringBuilder();
                    send(session.ws, "\r\n\u001b[33m" + username + "@" + host + "'s password: \u001b[0m");
                    return;
                }

                send(session.ws, "\r\n\u001b[36m[xTerminal] Authenticating as " + username + "@" + host + ":" + port + "...\u001b[0m\r\n");

                JSch jsch = new JSch();

                // Add private key if provided
                if (privateKey != null && !privateKey.trim().isEmpty()) {
                    byte[] prKeyBytes = privateKey.getBytes(StandardCharsets.UTF_8);
                    byte[] passBytes = (passphrase != null && !passphrase.isEmpty()) ? passphrase.getBytes(StandardCharsets.UTF_8) : null;
                    jsch.addIdentity("client-key", prKeyBytes, null, passBytes);
                }

                Session jschSession = jsch.getSession(username, host, port);
                if (password != null && !password.isEmpty()) {
                    jschSession.setPassword(password);
                }

                Properties config = new Properties();
                config.put("StrictHostKeyChecking", "no");
                config.put("PreferredAuthentications", "publickey,keyboard-interactive,password");
                jschSession.setConfig(config);
                jschSession.setTimeout(25000);
                jschSession.connect(20000);

                session.jschSession = jschSession;

                send(session.ws, "\u001b[32m[xTerminal] \u2714 Authentication successful. Initializing remote shell...\u001b[0m\r\n\r\n");

                // If password was manually typed and succeeded, inform client to optionally remember it
                if (inputPassword != null && !inputPassword.isEmpty()) {
                    JSONObject saveHost = new JSONObject();
                    saveHost.put("type", "save-host-password");
                    saveHost.put("hostname", host);
                    saveHost.put("port", port);
                    saveHost.put("username", username);
                    saveHost.put("password", inputPassword);
                    send(session.ws, saveHost.toString());
                }

                ChannelShell channel = (ChannelShell) jschSession.openChannel("shell");
                channel.setPtyType("xterm-256color", cols, rows, 0, 0);

                InputStream in = channel.getInputStream();
                OutputStream out = channel.getOutputStream();

                session.processOut = out;
                session.jschChannel = channel;

                channel.connect(10000);

                // Pipe remote SSH output directly to WebSocket
                byte[] buffer = new byte[8192];
                int read;
                while (channel.isConnected() && (read = in.read(buffer)) != -1) {
                    if (read > 0 && session.ws.isOpen()) {
                        session.ws.send(ByteBuffer.wrap(Arrays.copyOf(buffer, read)));
                    }
                }

                send(session.ws, "\r\n\u001b[90m[xTerminal] Remote SSH shell session ended.\u001b[0m\r\n");
                session.ws.close();
            } catch (Exception e) {
                Log.e(TAG, "SSH connection failure", e);
                send(session.ws, "\r\n\u001b[31m[xTerminal] SSH Connection Error: " + (e.getMessage() != null ? e.getMessage() : e.toString()) + "\u001b[0m\r\n");
                session.ws.close();
            }
        });
    }

    // ---------------------------------------------------------------------------------------------
    // Raw Telnet Connection
    // ---------------------------------------------------------------------------------------------

    private void startTelnetConnection(ClientSession session, JSONObject params) {
        session.streamPool.execute(() -> {
            try {
                String host = params.optString("host", "127.0.0.1");
                int port = params.optInt("port", 23);
                String username = params.optString("username", "");
                String password = params.optString("password", "");

                send(session.ws, "\r\n\u001b[36m[xTerminal] Connecting to raw Telnet stream at " + host + ":" + port + "...\u001b[0m\r\n");

                Socket socket = new Socket();
                socket.setKeepAlive(true);
                socket.setTcpNoDelay(true);
                socket.connect(new InetSocketAddress(host, port), 20000);
                session.telnetSocket = socket;

                InputStream in = socket.getInputStream();
                OutputStream out = socket.getOutputStream();
                session.processOut = out;

                send(session.ws, "\u001b[32m[xTerminal] \u2714 Telnet Connection Established to " + host + ":" + port + "\u001b[0m\r\n\r\n");

                boolean[] sentUser = { false };
                boolean[] sentPass = { false };

                byte[] buffer = new byte[8192];
                int read;
                while (!socket.isClosed() && (read = in.read(buffer)) != -1) {
                    if (read > 0 && session.ws.isOpen()) {
                        session.ws.send(ByteBuffer.wrap(Arrays.copyOf(buffer, read)));

                        String text = new String(buffer, 0, read, StandardCharsets.UTF_8);
                        if (!sentUser[0] && !username.isEmpty() && (text.toLowerCase().contains("login:") || text.toLowerCase().contains("username:"))) {
                            sentUser[0] = true;
                            Thread.sleep(250);
                            out.write((username + "\r\n").getBytes(StandardCharsets.UTF_8));
                            out.flush();
                        } else if (!sentPass[0] && !password.isEmpty() && text.toLowerCase().contains("password:")) {
                            sentPass[0] = true;
                            Thread.sleep(250);
                            out.write((password + "\r\n").getBytes(StandardCharsets.UTF_8));
                            out.flush();
                        }
                    }
                }

                send(session.ws, "\r\n\u001b[90m[xTerminal] Telnet connection closed by foreign host.\u001b[0m\r\n");
                session.ws.close();
            } catch (Exception e) {
                Log.e(TAG, "Telnet connection failure", e);
                send(session.ws, "\r\n\u001b[31m[xTerminal] Telnet Error: " + (e.getMessage() != null ? e.getMessage() : e.toString()) + "\u001b[0m\r\n");
                session.ws.close();
            }
        });
    }

    // ---------------------------------------------------------------------------------------------
    // Local Android Shell (/system/bin/sh) - Termux Mode
    // ---------------------------------------------------------------------------------------------

    private void startLocalShell(ClientSession session, JSONObject data) {
        session.isLocalShell = true;
        File home = null;
        if (mAppContext != null) {
            home = mAppContext.getFilesDir();
        }
        if (home == null || !home.exists()) {
            home = new File("/sdcard");
            if (!home.exists()) {
                home = new File("/data/local/tmp");
            }
        }
        session.localWorkingDir = home;

        String banner = "\r\n\u001b[1;32m════════════════════════════════════════\u001b[0m\r\n"
            + "\u001b[1;32m       xTerminal — Android Station (v1.2.9)\u001b[0m\r\n"
            + "\u001b[90m  Native Shell (/system/bin/sh) • Termux Mode\u001b[0m\r\n"
            + "\u001b[1;32m════════════════════════════════════════\u001b[0m\r\n\r\n";
        send(session.ws, banner);
        sendPrompt(session);
    }

    private void sendPrompt(ClientSession session) {
        String dirName = "~";
        if (session.localWorkingDir != null) {
            String path = session.localWorkingDir.getAbsolutePath();
            File home = mAppContext != null ? mAppContext.getFilesDir() : null;
            if (home != null && path.equals(home.getAbsolutePath())) {
                dirName = "~";
            } else if (home != null && path.startsWith(home.getAbsolutePath())) {
                dirName = "~" + path.substring(home.getAbsolutePath().length());
            } else {
                dirName = path;
            }
        }
        send(session.ws, "\u001b[1;34m" + dirName + " $ \u001b[0m");
    }

    private void clearLine(ClientSession session) {
        send(session.ws, "\r\u001b[K");
        sendPrompt(session);
    }

    private void handleLocalShellInput(ClientSession session, String input) {
        if (session.runningChildProcess != null && session.runningChildProcess.isAlive()) {
            if (input.contains("\u0003")) { // Ctrl+C
                try {
                    session.runningChildProcess.destroyForcibly();
                } catch (Exception ignored) {}
                session.runningChildProcess = null;
                send(session.ws, "^C\r\n");
                sendPrompt(session);
                return;
            }
            // Forward input to running process
            if (session.processOut != null) {
                try {
                    session.processOut.write(input.getBytes(StandardCharsets.UTF_8));
                    session.processOut.flush();
                } catch (Exception ignored) {}
            }
            return;
        }

        // Handle escape sequences (Up/Down Arrow History)
        if (input.equals("\u001b[A")) { // Up Arrow
            if (!session.commandHistory.isEmpty()) {
                if (session.historyIndex == -1) {
                    session.historyIndex = session.commandHistory.size() - 1;
                } else if (session.historyIndex > 0) {
                    session.historyIndex--;
                }
                String histCmd = session.commandHistory.get(session.historyIndex);
                clearLine(session);
                session.localLineBuffer.setLength(0);
                session.localLineBuffer.append(histCmd);
                send(session.ws, histCmd);
            }
            return;
        } else if (input.equals("\u001b[B")) { // Down Arrow
            if (session.historyIndex != -1) {
                if (session.historyIndex < session.commandHistory.size() - 1) {
                    session.historyIndex++;
                    String histCmd = session.commandHistory.get(session.historyIndex);
                    clearLine(session);
                    session.localLineBuffer.setLength(0);
                    session.localLineBuffer.append(histCmd);
                    send(session.ws, histCmd);
                } else {
                    session.historyIndex = -1;
                    clearLine(session);
                    session.localLineBuffer.setLength(0);
                }
            }
            return;
        }

        // Process characters sequentially
        for (int i = 0; i < input.length(); i++) {
            char ch = input.charAt(i);

            if (ch == '\u0003') { // Ctrl+C
                session.localLineBuffer.setLength(0);
                session.historyIndex = -1;
                send(session.ws, "^C\r\n");
                sendPrompt(session);
            } else if (ch == '\u000c') { // Ctrl+L (Clear screen)
                send(session.ws, "\u001b[2J\u001b[H");
                sendPrompt(session);
                send(session.ws, session.localLineBuffer.toString());
            } else if (ch == '\t') { // Tab completion
                handleTabCompletion(session);
            } else if (ch == '\r' || ch == '\n') {
                send(session.ws, "\r\n");
                String cmd = session.localLineBuffer.toString().trim();
                session.localLineBuffer.setLength(0);
                session.historyIndex = -1;

                if (cmd.isEmpty()) {
                    sendPrompt(session);
                    return;
                }

                session.commandHistory.add(cmd);

                if ("clear".equalsIgnoreCase(cmd)) {
                    send(session.ws, "\u001b[2J\u001b[H");
                    sendPrompt(session);
                    return;
                }

                if ("exit".equalsIgnoreCase(cmd)) {
                    send(session.ws, "\u001b[90m[xTerminal] Local shell closed.\u001b[0m\r\n");
                    session.ws.close();
                    return;
                }

                if (cmd.startsWith("cd ") || cmd.equals("cd")) {
                    handleCdCommand(session, cmd);
                    return;
                }

                if (cmd.startsWith("pkg") || cmd.startsWith("apt")) {
                    showPkgHelp(session);
                    sendPrompt(session);
                    return;
                }

                if ("help".equalsIgnoreCase(cmd)) {
                    showLocalHelp(session);
                    sendPrompt(session);
                    return;
                }

                executeLocalCommand(session, cmd);
                return;
            } else if (ch == '\u007F' || ch == '\b') {
                if (session.localLineBuffer.length() > 0) {
                    session.localLineBuffer.setLength(session.localLineBuffer.length() - 1);
                    send(session.ws, "\b \b");
                }
            } else if (ch >= 32) {
                session.localLineBuffer.append(ch);
                send(session.ws, String.valueOf(ch));
            }
        }
    }

    private void handleCdCommand(ClientSession session, String cmd) {
        String target = cmd.length() > 2 ? cmd.substring(2).trim() : "";
        File baseDir = session.localWorkingDir;
        if (baseDir == null) {
            baseDir = mAppContext != null ? mAppContext.getFilesDir() : new File("/");
        }

        File newDir;
        if (target.isEmpty() || target.equals("~")) {
            newDir = mAppContext != null ? mAppContext.getFilesDir() : new File("/sdcard");
        } else if (target.startsWith("/")) {
            newDir = new File(target);
        } else if (target.startsWith("~/")) {
            File home = mAppContext != null ? mAppContext.getFilesDir() : new File("/sdcard");
            newDir = new File(home, target.substring(2));
        } else {
            newDir = new File(baseDir, target);
        }

        try {
            newDir = newDir.getCanonicalFile();
            if (newDir.exists() && newDir.isDirectory()) {
                session.localWorkingDir = newDir;
            } else if (!newDir.exists()) {
                send(session.ws, "cd: no such file or directory: " + target + "\r\n");
            } else {
                send(session.ws, "cd: not a directory: " + target + "\r\n");
            }
        } catch (Exception e) {
            send(session.ws, "cd: " + e.getMessage() + "\r\n");
        }
        sendPrompt(session);
    }

    private void handleTabCompletion(ClientSession session) {
        String current = session.localLineBuffer.toString();
        int lastSpace = current.lastIndexOf(' ');
        String token = lastSpace >= 0 ? current.substring(lastSpace + 1) : current;

        File dir = session.localWorkingDir != null ? session.localWorkingDir : new File(".");
        File[] files = dir.listFiles();
        if (files == null || files.length == 0) return;

        List<String> matches = new ArrayList<>();
        for (File f : files) {
            if (f.getName().startsWith(token)) {
                matches.add(f.getName() + (f.isDirectory() ? "/" : ""));
            }
        }

        if (matches.size() == 1) {
            String full = matches.get(0);
            String addition = full.substring(token.length());
            session.localLineBuffer.append(addition);
            send(session.ws, addition);
        } else if (matches.size() > 1) {
            send(session.ws, "\r\n");
            StringBuilder sb = new StringBuilder();
            for (String m : matches) {
                sb.append(m).append("   ");
            }
            sb.append("\r\n");
            send(session.ws, sb.toString());
            sendPrompt(session);
            send(session.ws, session.localLineBuffer.toString());
        }
    }

    private void showLocalHelp(ClientSession session) {
        String help = "\u001b[1;36mxTerminal Android Station Commands & Utilities:\u001b[0m\r\n"
            + "  • \u001b[32mls, dir\u001b[0m       - List directory contents\r\n"
            + "  • \u001b[32mpwd\u001b[0m           - Print working directory\r\n"
            + "  • \u001b[32mcd <dir>\u001b[0m      - Change directory (e.g. cd /sdcard, cd ~)\r\n"
            + "  • \u001b[32muname -a\u001b[0m      - Display Linux kernel version & architecture\r\n"
            + "  • \u001b[32mping <host>\u001b[0m   - Send ICMP ECHO_REQUEST (e.g. ping -c 4 8.8.8.8)\r\n"
            + "  • \u001b[32mwhoami, id\u001b[0m     - Show Android user & group IDs\r\n"
            + "  • \u001b[32mclear\u001b[0m         - Clear terminal screen (or Ctrl+L)\r\n"
            + "  • \u001b[32mexit\u001b[0m          - Close terminal station\r\n"
            + "  • \u001b[33mTouch Bar\u001b[0m     - Use ESC, TAB, CTRL, ALT, and Arrow keys\r\n\r\n";
        send(session.ws, help);
    }

    private void showPkgHelp(ClientSession session) {
        String msg = "\u001b[33m[xTerminal] 'pkg' / 'apt' are Termux-specific package managers.\u001b[0m\r\n"
            + "\u001b[90mThis station runs on Android's native Linux shell (/system/bin/sh).\u001b[0m\r\n"
            + "\u001b[36m• Native commands available:\u001b[0m ls, pwd, cd, cat, ping, ip, ps, top, uname, whoami, df, etc.\r\n"
            + "\u001b[32m• Want full Linux packages (apt, python, git, docker)?\u001b[0m\r\n"
            + "  1. Tap \u001b[1;32m[SSH]\u001b[0m to connect to your Linux server, VPS, Raspberry Pi, or PC.\r\n"
            + "  2. Or if you have Termux installed on phone, run '\u001b[36msshd\u001b[0m' in Termux and connect via SSH to \u001b[1;32m127.0.0.1:8022\u001b[0m!\r\n\r\n";
        send(session.ws, msg);
    }

    private void executeLocalCommand(ClientSession session, String cmd) {
        session.streamPool.execute(() -> {
            try {
                ProcessBuilder pb = new ProcessBuilder("/system/bin/sh", "-c", cmd);
                pb.redirectErrorStream(true);

                if (session.localWorkingDir != null && session.localWorkingDir.exists()) {
                    pb.directory(session.localWorkingDir);
                }

                Map<String, String> env = pb.environment();
                env.put("TERM", "xterm-256color");
                env.put("PATH", "/system/bin:/system/xbin:/vendor/bin:/data/local/tmp");
                if (mAppContext != null) {
                    env.put("HOME", mAppContext.getFilesDir().getAbsolutePath());
                }

                Process process = pb.start();
                session.runningChildProcess = process;
                session.processOut = process.getOutputStream();

                InputStream in = process.getInputStream();
                byte[] buffer = new byte[4096];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    if (read > 0 && session.ws.isOpen()) {
                        String text = new String(buffer, 0, read, StandardCharsets.UTF_8);
                        String formatted = text.replace("\r\n", "\n").replace("\n", "\r\n");
                        send(session.ws, formatted);
                    }
                }
                process.waitFor();
            } catch (Exception e) {
                send(session.ws, "\u001b[31mError: " + (e.getMessage() != null ? e.getMessage() : e.toString()) + "\u001b[0m\r\n");
            } finally {
                session.runningChildProcess = null;
                session.processOut = null;
                sendPrompt(session);
            }
        });
    }

    private void send(WebSocket ws, String text) {
        if (ws != null && ws.isOpen()) {
            try {
                ws.send(text);
            } catch (Exception ignored) {}
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Session State Holder
    // ---------------------------------------------------------------------------------------------

    private static class ClientSession {
        final WebSocket ws;
        final ExecutorService streamPool = Executors.newCachedThreadPool();

        JSONObject hostParams;
        boolean isEnteringPassword = false;
        StringBuilder passwordBuffer = new StringBuilder();

        OutputStream processOut;
        Session jschSession;
        ChannelShell jschChannel;
        Socket telnetSocket;
        Process localProcess;

        // Local Android Station State (Termux Mode)
        boolean isLocalShell = false;
        File localWorkingDir;
        final StringBuilder localLineBuffer = new StringBuilder();
        final List<String> commandHistory = new ArrayList<>();
        int historyIndex = -1;
        Process runningChildProcess;

        ClientSession(WebSocket ws) {
            this.ws = ws;
        }

        void writeInput(byte[] data) {
            if (processOut == null) return;
            try {
                processOut.write(data);
                processOut.flush();
            } catch (Exception e) {
                Log.w(TAG, "Failed writing input to stream: " + e.getMessage());
            }
        }

        void handleResize(int cols, int rows) {
            try {
                if (jschChannel != null && jschChannel.isConnected()) {
                    jschChannel.setPtySize(cols, rows, 0, 0);
                }
            } catch (Exception ignored) {}
        }

        void close() {
            try {
                if (processOut != null) processOut.close();
            } catch (Exception ignored) {}

            try {
                if (jschChannel != null && jschChannel.isConnected()) {
                    jschChannel.disconnect();
                }
            } catch (Exception ignored) {}

            try {
                if (jschSession != null && jschSession.isConnected()) {
                    jschSession.disconnect();
                }
            } catch (Exception ignored) {}

            try {
                if (telnetSocket != null && !telnetSocket.isClosed()) {
                    telnetSocket.close();
                }
            } catch (Exception ignored) {}

            try {
                if (localProcess != null) {
                    localProcess.destroy();
                }
            } catch (Exception ignored) {}

            if (runningChildProcess != null) {
                try {
                    runningChildProcess.destroyForcibly();
                } catch (Exception ignored) {}
                runningChildProcess = null;
            }

            streamPool.shutdownNow();
        }
    }
}

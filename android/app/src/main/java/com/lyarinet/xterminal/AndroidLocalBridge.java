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
import java.util.Arrays;
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

            // 3. Raw user terminal keystrokes
            session.writeInput(message.getBytes(StandardCharsets.UTF_8));
        }

        @Override
        public void onMessage(WebSocket conn, ByteBuffer bytes) {
            ClientSession session = mSessions.get(conn);
            if (session == null) return;

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
    // Local Android Shell (/system/bin/sh)
    // ---------------------------------------------------------------------------------------------

    private void startLocalShell(ClientSession session, JSONObject data) {
        session.streamPool.execute(() -> {
            try {
                int cols = Math.max(10, data.optInt("cols", 80));
                int rows = Math.max(5, data.optInt("rows", 24));

                ProcessBuilder pb = new ProcessBuilder("/system/bin/sh", "-i");
                pb.redirectErrorStream(true);

                Map<String, String> env = pb.environment();
                env.put("TERM", "xterm-256color");
                env.put("COLUMNS", String.valueOf(cols));
                env.put("LINES", String.valueOf(rows));
                env.put("PATH", "/system/bin:/system/xbin:/vendor/bin:/data/local/tmp");

                if (mAppContext != null) {
                    File home = mAppContext.getFilesDir();
                    env.put("HOME", home.getAbsolutePath());
                    pb.directory(home);
                }

                Process process = pb.start();
                session.localProcess = process;
                session.processOut = process.getOutputStream();
                InputStream in = process.getInputStream();

                send(session.ws, "\r\n\u001b[32m[xTerminal] Local Android Station Initialized (/system/bin/sh)\u001b[0m\r\n\r\n");

                byte[] buffer = new byte[8192];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    if (read > 0 && session.ws.isOpen()) {
                        session.ws.send(ByteBuffer.wrap(Arrays.copyOf(buffer, read)));
                    }
                }

                int exitCode = process.waitFor();
                send(session.ws, "\r\n\u001b[90m[xTerminal] Local Android shell exited (code " + exitCode + ")\u001b[0m\r\n");
                session.ws.close();
            } catch (Exception e) {
                Log.e(TAG, "Local shell failure", e);
                send(session.ws, "\r\n\u001b[31m[xTerminal] Local Shell Error: " + (e.getMessage() != null ? e.getMessage() : e.toString()) + "\u001b[0m\r\n");
                session.ws.close();
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

            streamPool.shutdownNow();
        }
    }
}

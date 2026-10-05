package com.mangareader.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Local network sync between the owner's own devices (no Internet, no servers). Devices find each
 * other on the same Wi-Fi with Network Service Discovery, pair once by comparing a 6-digit code
 * derived from an ECDH key exchange (like Bluetooth numeric comparison), and afterwards open
 * mutually authenticated sessions encrypted with AES-GCM. The page runs the sync protocol over
 * those sessions. JS side: src/shared/infrastructure/localSync.ts
 */
@CapacitorPlugin(name = "LocalSync")
public class LocalSyncPlugin extends Plugin {

    private static final String SERVICE_TYPE = "_mangareader._tcp.";
    private static final String PREFS = "local_sync";
    private static final int MAX_FRAME = 32 * 1024 * 1024;
    private static final int CONNECT_TIMEOUT_MS = 5000;
    /** Receiving a large comic can take a while between messages (the page imports each one). */
    private static final int SESSION_TIMEOUT_MS = 5 * 60 * 1000;
    private static final byte FILE_BEGIN = 1;
    private static final byte FILE_DATA = 2;
    private static final byte FILE_END = 3;
    private static final long PROGRESS_STEP = 4L * 1024 * 1024;

    private final SecureRandom random = new SecureRandom();
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final Map<String, Peer> peers = new ConcurrentHashMap<>();
    /** Paired devices seen on the network: device id -> address. */
    private final Map<String, Endpoint> endpoints = new ConcurrentHashMap<>();
    /** Devices currently offering to pair. */
    private final Map<String, Endpoint> candidates = new ConcurrentHashMap<>();
    /** NSD service name -> device id, to forget devices that leave. */
    private final Map<String, String> serviceIds = new ConcurrentHashMap<>();
    private final Map<String, Session> sessions = new ConcurrentHashMap<>();
    private final ArrayDeque<NsdServiceInfo> resolveQueue = new ArrayDeque<>();

    private String deviceId;
    private String deviceName;
    private NsdManager nsd;
    private ServerSocket server;
    private NsdManager.RegistrationListener registration;
    private NsdManager.DiscoveryListener discovery;
    private boolean resolving = false;
    private boolean running = false;
    private volatile boolean pairingMode = false;
    private volatile Pairing pairing;

    private static final class Peer {

        final String id;
        final String name;
        final byte[] key;

        Peer(String id, String name, byte[] key) {
            this.id = id;
            this.name = name;
            this.key = key;
        }
    }

    private static final class Endpoint {

        final String id;
        final String name;
        final InetAddress host;
        final int port;

        Endpoint(String id, String name, InetAddress host, int port) {
            this.id = id;
            this.name = name;
            this.host = host;
            this.port = port;
        }
    }

    @Override
    public void load() {
        nsd = (NsdManager) getContext().getSystemService(Context.NSD_SERVICE);
        SharedPreferences prefs = prefs();
        deviceId = prefs.getString("deviceId", null);
        if (deviceId == null) {
            deviceId = UUID.randomUUID().toString();
            prefs.edit().putString("deviceId", deviceId).apply();
        }
        String systemName = Settings.Global.getString(getContext().getContentResolver(), "device_name");
        deviceName = systemName != null && !systemName.isEmpty() ? systemName : Build.MODEL;
        loadPeers();
        clearIncoming();
    }

    // ---------- Plugin API ----------

    @PluginMethod
    public void getState(PluginCall call) {
        JSObject state = new JSObject();
        state.put("deviceId", deviceId);
        state.put("deviceName", deviceName);
        state.put("running", running);
        state.put("port", server != null ? server.getLocalPort() : 0);
        JSArray list = new JSArray();
        for (Peer peer : peers.values()) {
            JSObject item = new JSObject();
            item.put("id", peer.id);
            item.put("name", peer.name);
            list.put(item);
        }
        state.put("peers", list);
        call.resolve(state);
    }

    /** Listens and advertises on the local network while the app is in the foreground. */
    @PluginMethod
    public void start(PluginCall call) {
        try {
            startNetwork();
            call.resolve();
        } catch (IOException e) {
            call.reject(e.getMessage(), "START_FAILED");
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopNetwork();
        call.resolve();
    }

    /** Pairing mode: this device shows up in the other device's pairing list. */
    @PluginMethod
    public void setPairingMode(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        pairingMode = enabled;
        candidates.clear();
        if (!enabled) cancelPairing("cancelled");
        try {
            startNetwork();
            reRegister();
            call.resolve();
        } catch (IOException e) {
            call.reject(e.getMessage(), "START_FAILED");
        }
    }

    @PluginMethod
    public void requestPairing(PluginCall call) {
        String id = call.getString("id");
        Endpoint endpoint = id == null ? null : candidates.get(id);
        if (endpoint == null) {
            call.reject("Device not found", "NOT_FOUND");
            return;
        }
        executor.execute(() -> startPairing(endpoint.host, endpoint.port));
        call.resolve();
    }

    /** The user compared the codes: `accept` when both devices show the same one. */
    @PluginMethod
    public void confirmPairing(PluginCall call) {
        boolean accept = Boolean.TRUE.equals(call.getBoolean("accept", false));
        Pairing current = pairing;
        if (current == null) {
            call.resolve();
            return;
        }
        if (accept) executor.execute(current::confirmLocally);
        else cancelPairing("rejected");
        call.resolve();
    }

    @PluginMethod
    public void unpair(PluginCall call) {
        String id = call.getString("id");
        if (id != null) {
            peers.remove(id);
            savePeers();
            for (Session session : sessions.values()) if (session.peer.id.equals(id)) session.close();
        }
        call.resolve();
    }

    /** Connects to every paired device currently on the network that has no open session. */
    @PluginMethod
    public void syncNow(PluginCall call) {
        for (Endpoint endpoint : endpoints.values()) {
            if (peers.containsKey(endpoint.id) && !hasSession(endpoint.id, "sync")) {
                executor.execute(() -> connectForSync(endpoint.host, endpoint.port, "sync", null));
            }
        }
        call.resolve();
    }

    /** Direct connection to a known address (when discovery is unavailable, e.g. emulators). */
    @PluginMethod
    public void connectTo(PluginCall call) {
        String host = call.getString("host");
        int port = call.getInt("port", 0);
        boolean pair = Boolean.TRUE.equals(call.getBoolean("pair", false));
        String purpose = call.getString("purpose", "sync");
        String requestId = call.getString("requestId");
        executor.execute(() -> {
            try {
                InetAddress address = InetAddress.getByName(host);
                if (pair) startPairing(address, port);
                else connectForSync(address, port, purpose, requestId);
            } catch (IOException e) {
                notifyFailure("unreachable");
            }
        });
        call.resolve();
    }

    /** Opens a session to send comics to a paired device that is on the network now. */
    @PluginMethod
    public void openSendSession(PluginCall call) {
        String peerId = call.getString("peerId", "");
        String requestId = call.getString("requestId");
        Endpoint endpoint = endpoints.get(peerId);
        if (endpoint == null || !peers.containsKey(peerId)) {
            call.reject("Device not on the network", "NOT_FOUND");
            return;
        }
        executor.execute(() -> connectForSync(endpoint.host, endpoint.port, "send", requestId));
        call.resolve();
    }

    /** Starts a file on the session; its bytes then arrive through the binary channel. */
    @PluginMethod
    public void beginOutgoingFile(PluginCall call) {
        Session session = sessions.get(call.getString("sessionId", ""));
        String fileId = call.getString("fileId", "");
        if (session == null) {
            call.reject("Session closed", "CLOSED");
            return;
        }
        executor.execute(() -> {
            try {
                JSONObject header = new JSONObject();
                header.put("fileId", fileId);
                session.send(concat(new byte[] { FILE_BEGIN }, bytes(header.toString())));
                BinaryChannel.Sink sink = chunk -> session.send(concat(new byte[] { FILE_DATA }, chunk));
                session.outgoingSink = sink;
                BinaryChannel.setSink(sink);
                call.resolve();
            } catch (Exception e) {
                session.close();
                call.reject(e.getMessage(), "CLOSED");
            }
        });
    }

    /** Fallback when the WebView has no binary channel: a base64 chunk over the bridge. */
    @PluginMethod
    public void writeOutgoingFile(PluginCall call) {
        Session session = sessions.get(call.getString("sessionId", ""));
        String data = call.getString("data", "");
        if (session == null) {
            call.reject("Session closed", "CLOSED");
            return;
        }
        executor.execute(() -> {
            try {
                session.send(concat(new byte[] { FILE_DATA }, Base64.decode(data, Base64.DEFAULT)));
                call.resolve();
            } catch (Exception e) {
                session.close();
                call.reject(e.getMessage(), "CLOSED");
            }
        });
    }

    @PluginMethod
    public void endOutgoingFile(PluginCall call) {
        Session session = sessions.get(call.getString("sessionId", ""));
        if (session == null) {
            call.reject("Session closed", "CLOSED");
            return;
        }
        executor.execute(() -> {
            try {
                if (session.outgoingSink != null) BinaryChannel.clearSink(session.outgoingSink);
                session.outgoingSink = null;
                session.send(new byte[] { FILE_END });
                call.resolve();
            } catch (Exception e) {
                session.close();
                call.reject(e.getMessage(), "CLOSED");
            }
        });
    }

    @PluginMethod
    public void send(PluginCall call) {
        Session session = sessions.get(call.getString("sessionId", ""));
        String data = call.getString("data", "");
        if (session == null) {
            call.reject("Session closed", "CLOSED");
            return;
        }
        executor.execute(() -> {
            try {
                session.send(data.getBytes(StandardCharsets.UTF_8));
                call.resolve();
            } catch (Exception e) {
                session.close();
                call.reject(e.getMessage(), "CLOSED");
            }
        });
    }

    @PluginMethod
    public void closeSession(PluginCall call) {
        Session session = sessions.get(call.getString("sessionId", ""));
        if (session != null) session.close();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        stopNetwork();
        executor.shutdownNow();
    }

    // ---------- Network: server and discovery ----------

    private synchronized void startNetwork() throws IOException {
        if (running) return;
        server = new ServerSocket(0);
        running = true;
        ServerSocket listening = server;
        executor.execute(() -> acceptLoop(listening));
        register();
        discover();
    }

    private synchronized void stopNetwork() {
        if (!running) return;
        running = false;
        pairingMode = false;
        cancelPairing("cancelled");
        try {
            if (registration != null) nsd.unregisterService(registration);
        } catch (Exception ignored) {
            // Already unregistered.
        }
        try {
            if (discovery != null) nsd.stopServiceDiscovery(discovery);
        } catch (Exception ignored) {
            // Already stopped.
        }
        registration = null;
        discovery = null;
        try {
            if (server != null) server.close();
        } catch (IOException ignored) {
            // Closing anyway.
        }
        server = null;
        endpoints.clear();
        candidates.clear();
        for (Session session : sessions.values()) session.close();
    }

    private void acceptLoop(ServerSocket listening) {
        while (!listening.isClosed()) {
            try {
                Socket socket = listening.accept();
                executor.execute(() -> handleIncoming(socket));
            } catch (IOException e) {
                return;
            }
        }
    }

    private void register() {
        NsdServiceInfo info = new NsdServiceInfo();
        info.setServiceName("MangaReader " + deviceId.substring(0, 8));
        info.setServiceType(SERVICE_TYPE);
        info.setPort(server.getLocalPort());
        info.setAttribute("id", deviceId);
        info.setAttribute("pair", pairingMode ? "1" : "0");
        info.setAttribute("name", deviceName.length() > 60 ? deviceName.substring(0, 60) : deviceName);
        registration = new NsdManager.RegistrationListener() {
            @Override
            public void onServiceRegistered(NsdServiceInfo serviceInfo) {}

            @Override
            public void onRegistrationFailed(NsdServiceInfo serviceInfo, int errorCode) {}

            @Override
            public void onServiceUnregistered(NsdServiceInfo serviceInfo) {}

            @Override
            public void onUnregistrationFailed(NsdServiceInfo serviceInfo, int errorCode) {}
        };
        nsd.registerService(info, NsdManager.PROTOCOL_DNS_SD, registration);
    }

    /** Advertises the new pairing state (TXT records cannot be updated in place). */
    private synchronized void reRegister() {
        if (!running) return;
        try {
            if (registration != null) nsd.unregisterService(registration);
        } catch (Exception ignored) {
            // Not registered.
        }
        register();
    }

    private void discover() {
        discovery = new NsdManager.DiscoveryListener() {
            @Override
            public void onStartDiscoveryFailed(String serviceType, int errorCode) {}

            @Override
            public void onStopDiscoveryFailed(String serviceType, int errorCode) {}

            @Override
            public void onDiscoveryStarted(String serviceType) {}

            @Override
            public void onDiscoveryStopped(String serviceType) {}

            @Override
            public void onServiceFound(NsdServiceInfo info) {
                if (info.getServiceName().contains(deviceId.substring(0, 8))) return;
                enqueueResolve(info);
            }

            @Override
            public void onServiceLost(NsdServiceInfo info) {
                String id = serviceIds.remove(info.getServiceName());
                if (id == null) return;
                endpoints.remove(id);
                if (candidates.remove(id) != null) notifyCandidates();
            }
        };
        nsd.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discovery);
    }

    /** Older Android versions resolve one service at a time. */
    private synchronized void enqueueResolve(NsdServiceInfo info) {
        resolveQueue.add(info);
        resolveNext();
    }

    private synchronized void resolveNext() {
        if (resolving || resolveQueue.isEmpty() || !running) return;
        resolving = true;
        nsd.resolveService(
            resolveQueue.poll(),
            new NsdManager.ResolveListener() {
                @Override
                public void onResolveFailed(NsdServiceInfo info, int errorCode) {
                    finishResolve();
                }

                @Override
                public void onServiceResolved(NsdServiceInfo info) {
                    onResolved(info);
                    finishResolve();
                }
            }
        );
    }

    private synchronized void finishResolve() {
        resolving = false;
        resolveNext();
    }

    private void onResolved(NsdServiceInfo info) {
        Map<String, byte[]> attributes = info.getAttributes();
        String id = text(attributes.get("id"));
        if (id == null || id.equals(deviceId) || info.getHost() == null) return;
        String name = text(attributes.get("name"));
        Endpoint endpoint = new Endpoint(id, name != null ? name : id, info.getHost(), info.getPort());
        serviceIds.put(info.getServiceName(), id);
        endpoints.put(id, endpoint);
        if ("1".equals(text(attributes.get("pair"))) && pairingMode && !peers.containsKey(id)) {
            candidates.put(id, endpoint);
            notifyCandidates();
        }
        // Both devices find each other: the one with the smaller id connects.
        if (peers.containsKey(id) && !hasSession(id, "sync") && deviceId.compareTo(id) < 0) {
            executor.execute(() -> connectForSync(endpoint.host, endpoint.port, "sync", null));
        }
    }

    private void notifyCandidates() {
        JSArray list = new JSArray();
        for (Endpoint endpoint : candidates.values()) {
            JSObject item = new JSObject();
            item.put("id", endpoint.id);
            item.put("name", endpoint.name);
            list.put(item);
        }
        JSObject event = new JSObject();
        event.put("candidates", list);
        notifyListeners("pairingCandidates", event);
    }

    // ---------- Incoming connections ----------

    private void handleIncoming(Socket socket) {
        try {
            socket.setSoTimeout(15000);
            DataInputStream in = new DataInputStream(socket.getInputStream());
            DataOutputStream out = new DataOutputStream(socket.getOutputStream());
            JSONObject hello = new JSONObject(new String(readFrame(in), StandardCharsets.UTF_8));
            String mode = hello.optString("mode");
            if ("sync".equals(mode)) acceptSync(socket, in, out, hello);
            else if ("pair".equals(mode) && pairingMode && pairing == null) acceptPairing(socket, in, out, hello);
            else socket.close();
        } catch (Exception e) {
            closeQuietly(socket);
        }
    }

    // ---------- Sync sessions: mutual authentication with the paired key ----------

    private void acceptSync(Socket socket, DataInputStream in, DataOutputStream out, JSONObject hello) throws Exception {
        Peer peer = peers.get(hello.getString("id"));
        if (peer == null) {
            socket.close();
            return;
        }
        byte[] clientNonce = Base64.decode(hello.getString("nonce"), Base64.NO_WRAP);
        byte[] serverNonce = randomBytes(16);
        JSONObject reply = new JSONObject();
        reply.put("id", deviceId);
        reply.put("nonce", Base64.encodeToString(serverNonce, Base64.NO_WRAP));
        reply.put("mac", b64(hmac(peer.key, concat(bytes("server"), clientNonce, serverNonce))));
        writeFrame(out, reply.toString().getBytes(StandardCharsets.UTF_8));
        JSONObject proof = new JSONObject(new String(readFrame(in), StandardCharsets.UTF_8));
        byte[] expected = hmac(peer.key, concat(bytes("client"), clientNonce, serverNonce));
        if (!MessageDigest.isEqual(expected, Base64.decode(proof.getString("mac"), Base64.NO_WRAP))) {
            socket.close();
            return;
        }
        openSession(socket, in, out, peer, clientNonce, serverNonce, false, hello.optString("purpose", "sync"), null);
    }

    private void connectForSync(InetAddress host, int port, String purpose, String requestId) {
        Socket socket = new Socket();
        try {
            socket.connect(new InetSocketAddress(host, port), CONNECT_TIMEOUT_MS);
            socket.setSoTimeout(15000);
            DataInputStream in = new DataInputStream(socket.getInputStream());
            DataOutputStream out = new DataOutputStream(socket.getOutputStream());
            byte[] clientNonce = randomBytes(16);
            JSONObject hello = new JSONObject();
            hello.put("mode", "sync");
            hello.put("purpose", purpose);
            hello.put("id", deviceId);
            hello.put("nonce", b64(clientNonce));
            writeFrame(out, hello.toString().getBytes(StandardCharsets.UTF_8));
            JSONObject reply = new JSONObject(new String(readFrame(in), StandardCharsets.UTF_8));
            Peer peer = peers.get(reply.getString("id"));
            if (peer == null || ("sync".equals(purpose) && hasSession(peer.id, "sync"))) {
                socket.close();
                notifySessionFailed(requestId);
                return;
            }
            byte[] serverNonce = Base64.decode(reply.getString("nonce"), Base64.NO_WRAP);
            byte[] expected = hmac(peer.key, concat(bytes("server"), clientNonce, serverNonce));
            if (!MessageDigest.isEqual(expected, Base64.decode(reply.getString("mac"), Base64.NO_WRAP))) {
                socket.close();
                return;
            }
            // Remember where it answered, so comics can be sent to it even before discovery sees it.
            endpoints.putIfAbsent(peer.id, new Endpoint(peer.id, peer.name, host, port));
            JSONObject proof = new JSONObject();
            proof.put("mac", b64(hmac(peer.key, concat(bytes("client"), clientNonce, serverNonce))));
            writeFrame(out, proof.toString().getBytes(StandardCharsets.UTF_8));
            openSession(socket, in, out, peer, clientNonce, serverNonce, true, purpose, requestId);
        } catch (Exception e) {
            closeQuietly(socket);
            notifySessionFailed(requestId);
        }
    }

    private void openSession(
        Socket socket,
        DataInputStream in,
        DataOutputStream out,
        Peer peer,
        byte[] clientNonce,
        byte[] serverNonce,
        boolean isClient,
        String purpose,
        String requestId
    ) throws Exception {
        byte[] key = hmac(peer.key, concat(bytes("session"), clientNonce, serverNonce));
        Session session = new Session(UUID.randomUUID().toString(), peer, socket, in, out, key, isClient, purpose);
        sessions.put(session.id, session);
        socket.setSoTimeout(SESSION_TIMEOUT_MS);
        JSObject event = new JSObject();
        event.put("sessionId", session.id);
        event.put("peerId", peer.id);
        event.put("peerName", peer.name);
        event.put("purpose", purpose);
        event.put("initiator", isClient);
        if (requestId != null) event.put("requestId", requestId);
        notifyListeners("sessionOpened", event);
        session.readLoop();
    }

    private boolean hasSession(String peerId, String purpose) {
        for (Session session : sessions.values()) {
            if (session.peer.id.equals(peerId) && session.purpose.equals(purpose)) return true;
        }
        return false;
    }

    private void notifySessionFailed(String requestId) {
        if (requestId == null) return;
        JSObject event = new JSObject();
        event.put("requestId", requestId);
        notifyListeners("sessionFailed", event);
    }

    private File cacheDirectory(String name) {
        File directory = new File(getContext().getCacheDir(), name);
        if (!directory.exists()) directory.mkdirs();
        return directory;
    }

    private void clearIncoming() {
        File[] files = new File(getContext().getCacheDir(), "incoming").listFiles();
        if (files != null) for (File file : files) file.delete();
    }

    /** An authenticated connection; each frame is AES-256-GCM with a per-direction counter IV. */
    private final class Session {

        final String id;
        final Peer peer;
        final Socket socket;
        final DataInputStream in;
        final DataOutputStream out;
        final SecretKeySpec key;
        final int sendDirection;
        final String purpose;
        volatile BinaryChannel.Sink outgoingSink;
        OutputStream incoming;
        File incomingFile;
        String incomingFileId;
        long received;
        long nextProgress;
        long sendCounter = 0;
        long receiveCounter = 0;
        boolean closed = false;

        Session(
            String id,
            Peer peer,
            Socket socket,
            DataInputStream in,
            DataOutputStream out,
            byte[] key,
            boolean isClient,
            String purpose
        ) {
            this.purpose = purpose;
            this.id = id;
            this.peer = peer;
            this.socket = socket;
            this.in = in;
            this.out = out;
            this.key = new SecretKeySpec(key, "AES");
            this.sendDirection = isClient ? 1 : 2;
        }

        synchronized void send(byte[] plain) throws Exception {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv(sendDirection, sendCounter++)));
            writeFrame(out, cipher.doFinal(plain));
        }

        void readLoop() {
            int receiveDirection = sendDirection == 1 ? 2 : 1;
            try {
                while (!closed) {
                    byte[] frame = readFrame(in);
                    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                    cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv(receiveDirection, receiveCounter++)));
                    byte[] plain = cipher.doFinal(frame);
                    // Text messages are JSON objects; comic files travel as binary frames.
                    if (plain.length > 0 && plain[0] != (byte) '{') {
                        receiveFile(plain);
                        continue;
                    }
                    JSObject event = new JSObject();
                    event.put("sessionId", id);
                    event.put("data", new String(plain, StandardCharsets.UTF_8));
                    notifyListeners("sessionMessage", event);
                }
            } catch (Exception e) {
                // Closed by either side, or a frame that failed authentication.
            } finally {
                close();
            }
        }

        /** Writes a received comic to the cache; the page imports it from there. */
        private void receiveFile(byte[] plain) throws Exception {
            switch (plain[0]) {
                case FILE_BEGIN: {
                    JSONObject header = new JSONObject(new String(plain, 1, plain.length - 1, StandardCharsets.UTF_8));
                    incomingFileId = header.getString("fileId");
                    incomingFile = new File(cacheDirectory("incoming"), UUID.randomUUID() + ".tmp");
                    incoming = new BufferedOutputStream(new FileOutputStream(incomingFile), 1 << 20);
                    received = 0;
                    nextProgress = PROGRESS_STEP;
                    break;
                }
                case FILE_DATA:
                    if (incoming == null) throw new IOException("Data without a file");
                    incoming.write(plain, 1, plain.length - 1);
                    received += plain.length - 1;
                    if (received >= nextProgress) {
                        nextProgress = received + PROGRESS_STEP;
                        JSObject event = new JSObject();
                        event.put("sessionId", id);
                        event.put("fileId", incomingFileId);
                        event.put("received", received);
                        notifyListeners("fileProgress", event);
                    }
                    break;
                case FILE_END: {
                    if (incoming == null) throw new IOException("End without a file");
                    incoming.close();
                    incoming = null;
                    JSObject event = new JSObject();
                    event.put("sessionId", id);
                    event.put("fileId", incomingFileId);
                    event.put("path", incomingFile.getAbsolutePath());
                    event.put("size", received);
                    incomingFile = null;
                    notifyListeners("fileReceived", event);
                    break;
                }
                default:
                    throw new IOException("Unknown frame");
            }
        }

        synchronized void close() {
            if (closed) return;
            closed = true;
            closeQuietly(socket);
            if (outgoingSink != null) BinaryChannel.clearSink(outgoingSink);
            if (incoming != null) {
                try {
                    incoming.close();
                } catch (IOException ignored) {
                    // Discarding a partial file.
                }
                if (incomingFile != null) incomingFile.delete();
            }
            sessions.remove(id);
            JSObject event = new JSObject();
            event.put("sessionId", id);
            notifyListeners("sessionClosed", event);
        }
    }

    // ---------- Pairing: ECDH + 6-digit numeric comparison ----------

    private void startPairing(InetAddress host, int port) {
        Socket socket = new Socket();
        try {
            socket.connect(new InetSocketAddress(host, port), CONNECT_TIMEOUT_MS);
            socket.setSoTimeout(120000);
            DataInputStream in = new DataInputStream(socket.getInputStream());
            DataOutputStream out = new DataOutputStream(socket.getOutputStream());
            KeyPair keys = ecKeyPair();
            JSONObject hello = new JSONObject();
            hello.put("mode", "pair");
            hello.put("id", deviceId);
            hello.put("name", deviceName);
            hello.put("pub", b64(keys.getPublic().getEncoded()));
            writeFrame(out, hello.toString().getBytes(StandardCharsets.UTF_8));
            JSONObject reply = new JSONObject(new String(readFrame(in), StandardCharsets.UTF_8));
            beginPairing(socket, in, out, keys, reply);
        } catch (Exception e) {
            closeQuietly(socket);
            notifyFailure("unreachable");
        }
    }

    private void acceptPairing(Socket socket, DataInputStream in, DataOutputStream out, JSONObject hello) throws Exception {
        socket.setSoTimeout(120000);
        KeyPair keys = ecKeyPair();
        JSONObject reply = new JSONObject();
        reply.put("id", deviceId);
        reply.put("name", deviceName);
        reply.put("pub", b64(keys.getPublic().getEncoded()));
        writeFrame(out, reply.toString().getBytes(StandardCharsets.UTF_8));
        beginPairing(socket, in, out, keys, hello);
    }

    private void beginPairing(Socket socket, DataInputStream in, DataOutputStream out, KeyPair keys, JSONObject other) throws Exception {
        byte[] otherPublic = Base64.decode(other.getString("pub"), Base64.NO_WRAP);
        PublicKey peerKey = KeyFactory.getInstance("EC").generatePublic(new X509EncodedKeySpec(otherPublic));
        KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
        agreement.init(keys.getPrivate());
        agreement.doPhase(peerKey, true);
        byte[] secret = agreement.generateSecret();

        // Both sides hash the same transcript (ordered), so both show the same code.
        byte[] ownPublic = keys.getPublic().getEncoded();
        boolean ownFirst = deviceId.compareTo(other.getString("id")) < 0;
        byte[] transcript = ownFirst ? concat(ownPublic, otherPublic) : concat(otherPublic, ownPublic);
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(concat(secret, transcript));
        int number = (ByteBuffer.wrap(digest, 0, 4).getInt() & 0x7fffffff) % 1_000_000;
        String code = String.format("%06d", number);
        byte[] longTermKey = hmac(secret, concat(bytes("mangareader-pair-v1"), transcript));

        Pairing current = new Pairing(socket, in, out, other.getString("id"), other.optString("name", "?"), longTermKey);
        pairing = current;
        JSObject event = new JSObject();
        event.put("code", code);
        event.put("peerName", current.peerName);
        notifyListeners("pairingCode", event);
        current.readLoop();
    }

    private final class Pairing {

        final Socket socket;
        final DataInputStream in;
        final DataOutputStream out;
        final String peerId;
        final String peerName;
        final byte[] key;
        boolean localConfirmed = false;
        boolean remoteConfirmed = false;
        boolean finished = false;

        Pairing(Socket socket, DataInputStream in, DataOutputStream out, String peerId, String peerName, byte[] key) {
            this.socket = socket;
            this.in = in;
            this.out = out;
            this.peerId = peerId;
            this.peerName = peerName;
            this.key = key;
        }

        synchronized void confirmLocally() {
            if (finished) return;
            localConfirmed = true;
            try {
                JSONObject confirm = new JSONObject();
                confirm.put("type", "confirm");
                confirm.put("mac", b64(hmac(key, concat(bytes("confirm"), bytes(deviceId)))));
                writeFrame(out, confirm.toString().getBytes(StandardCharsets.UTF_8));
            } catch (Exception e) {
                fail("unreachable");
                return;
            }
            completeIfBothConfirmed();
        }

        void readLoop() {
            try {
                while (!finished) {
                    JSONObject message = new JSONObject(new String(readFrame(in), StandardCharsets.UTF_8));
                    if ("cancel".equals(message.optString("type"))) {
                        fail("rejected");
                        return;
                    }
                    byte[] expected = hmac(key, concat(bytes("confirm"), bytes(peerId)));
                    byte[] mac = Base64.decode(message.optString("mac", ""), Base64.NO_WRAP);
                    // A different key means the codes could not match: someone in the middle.
                    if (!MessageDigest.isEqual(expected, mac)) {
                        fail("mismatch");
                        return;
                    }
                    synchronized (this) {
                        remoteConfirmed = true;
                        completeIfBothConfirmed();
                    }
                }
            } catch (Exception e) {
                if (!finished) fail("unreachable");
            }
        }

        private void completeIfBothConfirmed() {
            if (!localConfirmed || !remoteConfirmed || finished) return;
            finished = true;
            peers.put(peerId, new Peer(peerId, peerName, key));
            savePeers();
            closeQuietly(socket);
            pairing = null;
            JSObject event = new JSObject();
            event.put("id", peerId);
            event.put("name", peerName);
            notifyListeners("paired", event);
        }

        synchronized void cancel(String reason) {
            if (finished) return;
            try {
                JSONObject cancel = new JSONObject();
                cancel.put("type", "cancel");
                writeFrame(out, cancel.toString().getBytes(StandardCharsets.UTF_8));
            } catch (Exception ignored) {
                // The other side will notice the closed connection.
            }
            fail(reason);
        }

        synchronized void fail(String reason) {
            if (finished) return;
            finished = true;
            closeQuietly(socket);
            if (pairing == this) pairing = null;
            notifyFailure(reason);
        }
    }

    private void cancelPairing(String reason) {
        Pairing current = pairing;
        if (current != null) current.cancel(reason);
    }

    private void notifyFailure(String reason) {
        JSObject event = new JSObject();
        event.put("reason", reason);
        notifyListeners("pairingFailed", event);
    }

    // ---------- Persistence ----------

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private void loadPeers() {
        try {
            JSONArray list = new JSONArray(prefs().getString("peers", "[]"));
            for (int i = 0; i < list.length(); i++) {
                JSONObject item = list.getJSONObject(i);
                String id = item.getString("id");
                peers.put(id, new Peer(id, item.getString("name"), Base64.decode(item.getString("key"), Base64.NO_WRAP)));
            }
        } catch (Exception ignored) {
            // Corrupt preferences: start without paired devices.
        }
    }

    private void savePeers() {
        JSONArray list = new JSONArray();
        try {
            for (Peer peer : peers.values()) {
                JSONObject item = new JSONObject();
                item.put("id", peer.id);
                item.put("name", peer.name);
                item.put("key", b64(peer.key));
                list.put(item);
            }
        } catch (Exception ignored) {
            return;
        }
        prefs().edit().putString("peers", list.toString()).apply();
    }

    // ---------- Helpers ----------

    private static void writeFrame(DataOutputStream out, byte[] data) throws IOException {
        synchronized (out) {
            out.writeInt(data.length);
            out.write(data);
            out.flush();
        }
    }

    private static byte[] readFrame(DataInputStream in) throws IOException {
        int length = in.readInt();
        if (length < 0 || length > MAX_FRAME) throw new IOException("Invalid frame");
        byte[] data = new byte[length];
        in.readFully(data);
        return data;
    }

    private static byte[] iv(int direction, long counter) {
        return ByteBuffer.allocate(12).putInt(direction).putLong(counter).array();
    }

    private static byte[] hmac(byte[] key, byte[] data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data);
    }

    private static KeyPair ecKeyPair() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        return generator.generateKeyPair();
    }

    private byte[] randomBytes(int length) {
        byte[] data = new byte[length];
        random.nextBytes(data);
        return data;
    }

    private static byte[] concat(byte[]... parts) {
        int length = 0;
        for (byte[] part : parts) length += part.length;
        byte[] result = Arrays.copyOf(parts[0], length);
        int offset = parts[0].length;
        for (int i = 1; i < parts.length; i++) {
            System.arraycopy(parts[i], 0, result, offset, parts[i].length);
            offset += parts[i].length;
        }
        return result;
    }

    private static byte[] bytes(String text) {
        return text.getBytes(StandardCharsets.UTF_8);
    }

    private static String b64(byte[] data) {
        return Base64.encodeToString(data, Base64.NO_WRAP);
    }

    private static String text(byte[] value) {
        return value == null ? null : new String(value, StandardCharsets.UTF_8);
    }

    private static void closeQuietly(Socket socket) {
        try {
            socket.close();
        } catch (IOException ignored) {
            // Already closed.
        }
    }
}

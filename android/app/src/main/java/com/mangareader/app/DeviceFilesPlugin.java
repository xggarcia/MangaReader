package com.mangareader.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Parcelable;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;
import java.util.zip.Deflater;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

/**
 * Access to the user's files without any network or broad storage permission: a comics folder
 * granted through the system picker (Storage Access Framework), picked files that can be deleted
 * once imported, files opened or shared with the app, and library export files written from
 * chunks sent by the page and read back entry by entry.
 * JS side: src/shared/infrastructure/deviceFiles.ts
 */
@CapacitorPlugin(name = "DeviceFiles")
public class DeviceFilesPlugin extends Plugin {

    private static final Pattern IMPORTABLE = Pattern.compile("(?i).+\\.(cbz|cbr|zip|rar|mangareader)$");
    private static final int MAX_DEPTH = 6;
    private static final int BUFFER = 1 << 20;
    private static final int READ_WRITE = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;

    /** One thread keeps file operations off the UI thread and in the order they were called. */
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Map<String, ZipOutputStream> exports = new HashMap<>();
    private final Map<String, File> exportFiles = new HashMap<>();
    private final Map<String, ZipInputStream> backups = new HashMap<>();
    private final List<JSObject> receivedFiles = new ArrayList<>();
    private int nextId = 1;
    /** Export receiving binary chunks from the page (only one runs at a time). */
    private String activeExport = null;

    @Override
    public void load() {
        Intent launchIntent = getActivity().getIntent();
        if (launchIntent != null) collectReceived(launchIntent);
        clearDirectory(new File(getContext().getCacheDir(), "imports"));
        registerBinaryChannel();
    }

    /**
     * Exports are hundreds of MB: going through the plugin bridge means base64 inside JSON. This
     * channel receives the bytes as ArrayBuffers instead (window.MangaReaderExport in the page)
     * and answers each chunk once written, so the page never runs ahead of the disk.
     */
    private void registerBinaryChannel() {
        if (
            !WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER) ||
            !WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_ARRAY_BUFFER)
        ) {
            return;
        }
        WebViewCompat.addWebMessageListener(
            getBridge().getWebView(),
            "MangaReaderExport",
            Set.of("https://localhost"),
            (view, message, sourceOrigin, isMainFrame, reply) -> {
                if (message.getType() != WebMessageCompat.TYPE_ARRAY_BUFFER) return;
                byte[] data = message.getArrayBuffer();
                io.execute(() -> {
                    String answer = "ok";
                    try {
                        exportStream(activeExport).write(data);
                    } catch (Exception e) {
                        answer = isStorageFull(e) ? "error:STORAGE_FULL" : "error:EXPORT_FAILED";
                    }
                    final String result = answer;
                    getActivity().runOnUiThread(() -> reply.postMessage(result));
                });
            }
        );
    }

    // ---------- Comics folder ----------

    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(READ_WRITE | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        startActivityForResult(call, intent, "folderPicked");
    }

    @ActivityCallback
    private void folderPicked(PluginCall call, ActivityResult result) {
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            call.resolve(new JSObject());
            return;
        }
        Uri tree = data.getData();
        ContentResolver resolver = getContext().getContentResolver();
        try {
            resolver.takePersistableUriPermission(tree, READ_WRITE);
        } catch (SecurityException e) {
            resolver.takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        }
        Uri root = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree));
        JSObject folder = new JSObject();
        folder.put("uri", tree.toString());
        folder.put("name", displayName(root, tree.getLastPathSegment()));
        call.resolve(folder);
    }

    /** Comic archives and library exports inside the folder and its sub-folders. */
    @PluginMethod
    public void listFolder(PluginCall call) {
        String uri = call.getString("uri");
        if (uri == null) {
            call.reject("Missing uri");
            return;
        }
        io.execute(() -> {
            try {
                Uri tree = Uri.parse(uri);
                JSArray files = new JSArray();
                walk(tree, DocumentsContract.getTreeDocumentId(tree), "", 0, files);
                JSObject response = new JSObject();
                response.put("files", files);
                call.resolve(response);
            } catch (SecurityException e) {
                call.reject("No access to the folder", "NO_ACCESS");
            } catch (Exception e) {
                call.reject(e.getMessage(), "LIST_FAILED");
            }
        });
    }

    private void walk(Uri tree, String documentId, String folder, int depth, JSArray out) {
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, documentId);
        String[] columns = {
            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_MIME_TYPE,
            DocumentsContract.Document.COLUMN_SIZE,
            DocumentsContract.Document.COLUMN_LAST_MODIFIED
        };
        try (Cursor cursor = getContext().getContentResolver().query(children, columns, null, null, null)) {
            if (cursor == null) return;
            while (cursor.moveToNext()) {
                String id = cursor.getString(0);
                String name = cursor.getString(1);
                String mime = cursor.getString(2);
                if (name == null || name.startsWith(".")) continue;
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                    if (depth < MAX_DEPTH) walk(tree, id, folder.isEmpty() ? name : folder + "/" + name, depth + 1, out);
                } else if (IMPORTABLE.matcher(name).matches()) {
                    JSObject file = new JSObject();
                    file.put("uri", DocumentsContract.buildDocumentUriUsingTree(tree, id).toString());
                    file.put("name", name);
                    file.put("size", cursor.isNull(3) ? 0 : cursor.getLong(3));
                    file.put("modified", cursor.isNull(4) ? 0 : cursor.getLong(4));
                    file.put("folder", folder);
                    out.put(file);
                }
            }
        }
    }

    // ---------- Picked, opened and shared files ----------

    @PluginMethod
    public void pickFiles(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        intent.addFlags(READ_WRITE | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "filesPicked");
    }

    @ActivityCallback
    private void filesPicked(PluginCall call, ActivityResult result) {
        Intent data = result.getData();
        JSArray files = new JSArray();
        if (result.getResultCode() == Activity.RESULT_OK && data != null) {
            List<Uri> uris = new ArrayList<>();
            if (data.getClipData() != null) {
                for (int i = 0; i < data.getClipData().getItemCount(); i++) uris.add(data.getClipData().getItemAt(i).getUri());
            } else if (data.getData() != null) {
                uris.add(data.getData());
            }
            ContentResolver resolver = getContext().getContentResolver();
            for (Uri uri : uris) {
                // Write access lets the original be deleted once it has been imported.
                try {
                    resolver.takePersistableUriPermission(uri, READ_WRITE);
                } catch (SecurityException e) {
                    try {
                        resolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    } catch (SecurityException ignored) {
                        // Temporary access still lasts while the app is running.
                    }
                }
                files.put(describe(uri));
            }
        }
        JSObject response = new JSObject();
        response.put("files", files);
        call.resolve(response);
    }

    /** Files opened with the app or shared to it since the last call. */
    @PluginMethod
    public void takeReceivedFiles(PluginCall call) {
        JSArray files = new JSArray();
        synchronized (receivedFiles) {
            for (JSObject file : receivedFiles) files.put(file);
            receivedFiles.clear();
        }
        JSObject response = new JSObject();
        response.put("files", files);
        call.resolve(response);
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (collectReceived(intent)) notifyListeners("filesReceived", new JSObject(), true);
    }

    private boolean collectReceived(Intent intent) {
        List<Uri> uris = new ArrayList<>();
        String action = intent.getAction();
        if (Intent.ACTION_VIEW.equals(action) && intent.getData() != null) {
            uris.add(intent.getData());
        } else if (Intent.ACTION_SEND.equals(action)) {
            Parcelable stream = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (stream instanceof Uri) uris.add((Uri) stream);
        } else if (Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            ArrayList<Parcelable> streams = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (streams != null) for (Parcelable stream : streams) if (stream instanceof Uri) uris.add((Uri) stream);
        }
        if (uris.isEmpty()) return false;
        synchronized (receivedFiles) {
            for (Uri uri : uris) {
                if (!"content".equals(uri.getScheme())) continue;
                JSObject file = describe(uri);
                file.put("received", true);
                receivedFiles.add(file);
            }
        }
        // Handled once: a configuration change must not import the same files again.
        intent.setAction(Intent.ACTION_MAIN);
        return true;
    }

    @PluginMethod
    public void deleteFile(PluginCall call) {
        String uri = call.getString("uri");
        io.execute(() -> {
            boolean deleted = false;
            try {
                deleted = uri != null && DocumentsContract.deleteDocument(getContext().getContentResolver(), Uri.parse(uri));
            } catch (Exception ignored) {
                // Read-only location or access revoked: the original simply stays.
            }
            JSObject response = new JSObject();
            response.put("deleted", deleted);
            call.resolve(response);
        });
    }

    /**
     * Copies a content URI into the app cache, so the page can read it as a local file (the
     * page reads files from https://localhost/_capacitor_file_/...).
     */
    @PluginMethod
    public void copyToCache(PluginCall call) {
        String uri = call.getString("uri");
        io.execute(() -> {
            File target = new File(cacheDirectory("imports"), (nextId++) + ".tmp");
            try (InputStream in = getContext().getContentResolver().openInputStream(Uri.parse(uri)); OutputStream out = new FileOutputStream(target)) {
                if (in == null) throw new IOException("Cannot open " + uri);
                copy(in, out);
                JSObject response = new JSObject();
                response.put("path", target.getAbsolutePath());
                call.resolve(response);
            } catch (Exception e) {
                target.delete();
                call.reject(e.getMessage(), "READ_FAILED");
            }
        });
    }

    @PluginMethod
    public void deleteCacheFile(PluginCall call) {
        String path = call.getString("path");
        io.execute(() -> {
            File file = path == null ? null : new File(path);
            if (file != null && file.getAbsolutePath().startsWith(getContext().getCacheDir().getAbsolutePath())) file.delete();
            call.resolve();
        });
    }

    // ---------- Library export: a ZIP written from chunks ----------

    @PluginMethod
    public void createExport(PluginCall call) {
        String fileName = call.getString("fileName", "MangaReader.mangareader");
        io.execute(() -> {
            try {
                File directory = cacheDirectory("exports");
                clearDirectory(directory);
                File file = new File(directory, fileName);
                ZipOutputStream zip = new ZipOutputStream(new BufferedOutputStream(new FileOutputStream(file), BUFFER));
                // Comics are already compressed: store them (deflate level 0 keeps it streamable).
                zip.setLevel(Deflater.NO_COMPRESSION);
                String id = "export-" + (nextId++);
                exports.put(id, zip);
                exportFiles.put(id, file);
                activeExport = id;
                JSObject response = new JSObject();
                response.put("id", id);
                call.resolve(response);
            } catch (IOException e) {
                call.reject(e.getMessage(), "EXPORT_FAILED");
            }
        });
    }

    @PluginMethod
    public void addExportEntry(PluginCall call) {
        String id = call.getString("id");
        String name = call.getString("name");
        io.execute(() -> {
            try {
                exportStream(id).putNextEntry(new ZipEntry(name));
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage(), "EXPORT_FAILED");
            }
        });
    }

    @PluginMethod
    public void writeExport(PluginCall call) {
        String id = call.getString("id");
        String data = call.getString("data", "");
        io.execute(() -> {
            try {
                exportStream(id).write(Base64.decode(data, Base64.DEFAULT));
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage(), isStorageFull(e) ? "STORAGE_FULL" : "EXPORT_FAILED");
            }
        });
    }

    @PluginMethod
    public void finishExport(PluginCall call) {
        String id = call.getString("id");
        io.execute(() -> {
            try {
                exportStream(id).close();
                File file = exportFiles.remove(id);
                exports.remove(id);
                JSObject response = new JSObject();
                response.put("path", file.getAbsolutePath());
                response.put("size", file.length());
                call.resolve(response);
            } catch (Exception e) {
                call.reject(e.getMessage(), isStorageFull(e) ? "STORAGE_FULL" : "EXPORT_FAILED");
            }
        });
    }

    @PluginMethod
    public void abortExport(PluginCall call) {
        String id = call.getString("id");
        io.execute(() -> {
            ZipOutputStream zip = exports.remove(id);
            File file = exportFiles.remove(id);
            try {
                if (zip != null) zip.close();
            } catch (IOException ignored) {
                // Being discarded anyway.
            }
            if (file != null) file.delete();
            call.resolve();
        });
    }

    /** Opens the system share sheet (Quick Share, Bluetooth, Drive...) for an export file. */
    @PluginMethod
    public void shareExport(PluginCall call) {
        File file = exportFile(call.getString("path"));
        if (file == null) {
            call.reject("Export not found");
            return;
        }
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("application/octet-stream");
        send.putExtra(Intent.EXTRA_STREAM, uri);
        send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        Intent chooser = Intent.createChooser(send, call.getString("title", file.getName()));
        chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getActivity().startActivity(chooser);
        call.resolve();
    }

    /** Copies an export file into the comics folder. */
    @PluginMethod
    public void saveExportToFolder(PluginCall call) {
        File file = exportFile(call.getString("path"));
        String folderUri = call.getString("folderUri");
        if (file == null || folderUri == null) {
            call.reject("Missing export or folder");
            return;
        }
        io.execute(() -> {
            try {
                Uri tree = Uri.parse(folderUri);
                Uri root = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree));
                ContentResolver resolver = getContext().getContentResolver();
                Uri target = DocumentsContract.createDocument(resolver, root, "application/octet-stream", file.getName());
                if (target == null) throw new IOException("Cannot create the file");
                try (InputStream in = new FileInputStream(file); OutputStream out = resolver.openOutputStream(target)) {
                    if (out == null) throw new IOException("Cannot write the file");
                    copy(in, out);
                }
                JSObject response = new JSObject();
                response.put("uri", target.toString());
                call.resolve(response);
            } catch (SecurityException e) {
                call.reject("No access to the folder", "NO_ACCESS");
            } catch (Exception e) {
                call.reject(e.getMessage(), isStorageFull(e) ? "STORAGE_FULL" : "EXPORT_FAILED");
            }
        });
    }

    // ---------- Library import: an export read entry by entry ----------

    @PluginMethod
    public void openBackup(PluginCall call) {
        String uri = call.getString("uri");
        io.execute(() -> {
            try {
                InputStream in = getContext().getContentResolver().openInputStream(Uri.parse(uri));
                if (in == null) throw new IOException("Cannot open " + uri);
                String id = "backup-" + (nextId++);
                backups.put(id, new ZipInputStream(new BufferedInputStream(in, BUFFER)));
                JSObject response = new JSObject();
                response.put("id", id);
                call.resolve(response);
            } catch (Exception e) {
                call.reject(e.getMessage(), "READ_FAILED");
            }
        });
    }

    /** Moves to the next entry; `extract` copies it to a cache file the page can read. */
    @PluginMethod
    public void nextBackupEntry(PluginCall call) {
        String id = call.getString("id");
        io.execute(() -> {
            ZipInputStream zip = backups.get(id);
            if (zip == null) {
                call.reject("Unknown backup");
                return;
            }
            try {
                ZipEntry entry;
                do {
                    entry = zip.getNextEntry();
                } while (entry != null && entry.isDirectory());
                JSObject response = new JSObject();
                if (entry == null) {
                    response.put("done", true);
                } else {
                    response.put("done", false);
                    response.put("name", entry.getName());
                }
                call.resolve(response);
            } catch (Exception e) {
                call.reject(e.getMessage(), "CORRUPT");
            }
        });
    }

    @PluginMethod
    public void extractBackupEntry(PluginCall call) {
        String id = call.getString("id");
        io.execute(() -> {
            ZipInputStream zip = backups.get(id);
            if (zip == null) {
                call.reject("Unknown backup");
                return;
            }
            File target = new File(cacheDirectory("imports"), (nextId++) + ".tmp");
            try (OutputStream out = new FileOutputStream(target)) {
                copy(zip, out);
                JSObject response = new JSObject();
                response.put("path", target.getAbsolutePath());
                call.resolve(response);
            } catch (Exception e) {
                target.delete();
                call.reject(e.getMessage(), isStorageFull(e) ? "STORAGE_FULL" : "CORRUPT");
            }
        });
    }

    @PluginMethod
    public void closeBackup(PluginCall call) {
        String id = call.getString("id");
        io.execute(() -> {
            ZipInputStream zip = backups.remove(id);
            try {
                if (zip != null) zip.close();
            } catch (IOException ignored) {
                // Nothing left to read.
            }
            clearDirectory(new File(getContext().getCacheDir(), "imports"));
            call.resolve();
        });
    }

    // ---------- Helpers ----------

    private ZipOutputStream exportStream(String id) throws IOException {
        ZipOutputStream zip = exports.get(id);
        if (zip == null) throw new IOException("Unknown export " + id);
        return zip;
    }

    private File exportFile(String path) {
        if (path == null) return null;
        File file = new File(path);
        boolean inExports = file.getAbsolutePath().startsWith(cacheDirectory("exports").getAbsolutePath());
        return inExports && file.exists() ? file : null;
    }

    private JSObject describe(Uri uri) {
        JSObject file = new JSObject();
        file.put("uri", uri.toString());
        file.put("name", uri.getLastPathSegment());
        file.put("size", 0);
        file.put("modified", 0);
        file.put("folder", "");
        String[] columns = { OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE };
        try (Cursor cursor = getContext().getContentResolver().query(uri, columns, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                if (!cursor.isNull(0)) file.put("name", cursor.getString(0));
                if (!cursor.isNull(1)) file.put("size", cursor.getLong(1));
            }
        } catch (Exception ignored) {
            // Name and size stay as fallbacks.
        }
        return file;
    }

    private String displayName(Uri document, String fallback) {
        String[] columns = { DocumentsContract.Document.COLUMN_DISPLAY_NAME };
        try (Cursor cursor = getContext().getContentResolver().query(document, columns, null, null, null)) {
            if (cursor != null && cursor.moveToFirst() && !cursor.isNull(0)) return cursor.getString(0);
        } catch (Exception ignored) {
            // Use the fallback.
        }
        return fallback;
    }

    private File cacheDirectory(String name) {
        File directory = new File(getContext().getCacheDir(), name);
        if (!directory.exists()) directory.mkdirs();
        return directory;
    }

    private static void clearDirectory(File directory) {
        File[] files = directory.listFiles();
        if (files == null) return;
        for (File file : files) file.delete();
    }

    private static void copy(InputStream in, OutputStream out) throws IOException {
        byte[] buffer = new byte[BUFFER];
        int read;
        while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
    }

    private static boolean isStorageFull(Exception e) {
        String message = e.getMessage();
        return message != null && (message.contains("ENOSPC") || message.toLowerCase().contains("no space"));
    }
}

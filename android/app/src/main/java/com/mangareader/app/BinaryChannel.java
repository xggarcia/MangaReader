package com.mangareader.app;

/**
 * Where the raw byte chunks the page posts on window.MangaReaderExport go: a library export being
 * written (DeviceFilesPlugin) or a comic being sent to a paired device (LocalSyncPlugin). Only one
 * stream runs at a time; the plugin that starts one sets the sink.
 */
final class BinaryChannel {

    interface Sink {
        void write(byte[] data) throws Exception;
    }

    private static volatile Sink sink;

    private BinaryChannel() {}

    static void setSink(Sink newSink) {
        sink = newSink;
    }

    static void clearSink(Sink current) {
        if (sink == current) sink = null;
    }

    static void write(byte[] data) throws Exception {
        Sink current = sink;
        if (current == null) throw new IllegalStateException("No stream open");
        current.write(data);
    }
}

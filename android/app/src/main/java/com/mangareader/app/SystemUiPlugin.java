package com.mangareader.app;

import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** System bars control. JS side: src/shared/infrastructure/nativeSystemUi.ts */
@CapacitorPlugin(name = "SystemUi")
public class SystemUiPlugin extends Plugin {

    /** Hides (immersive) or shows the status and navigation bars. */
    @PluginMethod
    public void setImmersive(PluginCall call) {
        final boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        getActivity()
            .runOnUiThread(() -> {
                WindowInsetsControllerCompat controller = controller();
                if (enabled) {
                    controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                    controller.hide(WindowInsetsCompat.Type.systemBars());
                } else {
                    controller.show(WindowInsetsCompat.Type.systemBars());
                }
                call.resolve();
            });
    }

    /** Dark icons on light content (`darkIcons: true`) or light icons on dark content. */
    @PluginMethod
    public void setBarsStyle(PluginCall call) {
        final boolean darkIcons = Boolean.TRUE.equals(call.getBoolean("darkIcons", true));
        getActivity()
            .runOnUiThread(() -> {
                WindowInsetsControllerCompat controller = controller();
                controller.setAppearanceLightStatusBars(darkIcons);
                controller.setAppearanceLightNavigationBars(darkIcons);
                call.resolve();
            });
    }

    private WindowInsetsControllerCompat controller() {
        Window window = getActivity().getWindow();
        return WindowCompat.getInsetsController(window, window.getDecorView());
    }
}

package com.famichat.app;

import android.os.Bundle;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.graphics.Insets;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars());
            Insets navInsets = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars());
            float density = getResources().getDisplayMetrics().density;
            int topDp = (int) (insets.top / density);
            int bottomDp = (int) (navInsets.bottom / density);

            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().post(() -> {
                    this.bridge.getWebView().evaluateJavascript(
                        "document.documentElement.style.setProperty('--sat', '" + topDp + "px');" +
                        "document.documentElement.style.setProperty('--sab', '" + bottomDp + "px');",
                        null
                    );
                });
            }
            return windowInsets;
        });
    }
}

package com.lyarinet.xterminal;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Start standalone native terminal bridge on 127.0.0.1:3000 before WebView loads
        AndroidLocalBridge.getInstance().startBridge(this, AndroidLocalBridge.DEFAULT_PORT);
        super.onCreate(savedInstanceState);

        // Check Google Play Store for new version updates
        PlayStoreUpdateManager.getInstance().checkForAppUpdate(this);
    }

    @Override
    public void onResume() {
        super.onResume();
        // Handle pending or downloaded Play Store in-app updates
        PlayStoreUpdateManager.getInstance().onResume(this);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        // Cleanly terminate local bridge and active SSH/Telnet sessions
        AndroidLocalBridge.getInstance().stopBridge();
        PlayStoreUpdateManager.getInstance().onDestroy();
    }
}

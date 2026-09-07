package com.lyarinet.xterminal;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Start standalone native terminal bridge on 127.0.0.1:3000
        AndroidLocalBridge.getInstance().startBridge(this, AndroidLocalBridge.DEFAULT_PORT);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        // Cleanly terminate local bridge and active SSH/Telnet sessions
        AndroidLocalBridge.getInstance().stopBridge();
    }
}

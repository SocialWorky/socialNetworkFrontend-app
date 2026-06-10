package app.worky.cl;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Required by @capacitor-community/safe-area: render edge-to-edge so
        // env(safe-area-inset-*) is passed through to the webview.
        EdgeToEdge.enable(this);
    }
}

package com.hangyeol.movingcontract;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);

        webView.addJavascriptInterface(new AndroidBridge(this), "AndroidBridge");

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .setDomain("appassets.androidplatform.net")
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return assetLoader.shouldInterceptRequest(Uri.parse(url));
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectOfflineHelpers();
            }
        });

        webView.loadUrl("https://appassets.androidplatform.net/index.html");
    }

    private void injectOfflineHelpers() {
        String js = "(function(){" +
                "if(window.__hangyeolAndroidPatched)return;window.__hangyeolAndroidPatched=true;" +
                "document.addEventListener('click',function(e){" +
                "var a=e.target&&e.target.closest?e.target.closest('a[download]'):null;if(!a)return;" +
                "var href=a.href||'';var name=a.getAttribute('download')||'download';" +
                "if(href.indexOf('data:')===0){e.preventDefault();var m=href.match(/^data:([^;,]+)/);AndroidBridge.saveDataUrl(name,m?m[1]:'application/octet-stream',href);}" +
                "else if(href.indexOf('blob:')===0){e.preventDefault();fetch(href).then(function(r){return r.blob();}).then(function(b){var fr=new FileReader();fr.onloadend=function(){AndroidBridge.saveDataUrl(name,b.type||'application/octet-stream',fr.result);};fr.readAsDataURL(b);});}" +
                "},true);" +
                "})();";
        webView.evaluateJavascript(js, null);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    public static class AndroidBridge {
        private final Activity activity;

        AndroidBridge(Activity activity) {
            this.activity = activity;
        }

        @JavascriptInterface
        public void saveDataUrl(String filename, String mimeType, String dataUrl) {
            try {
                int comma = dataUrl.indexOf(',');
                String base64 = comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl;
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                saveBytes(filename, mimeType, bytes);
            } catch (Exception e) {
                showToast("파일 저장에 실패했습니다.");
            }
        }

        @JavascriptInterface
        public void saveText(String filename, String mimeType, String text) {
            try {
                saveBytes(filename, mimeType, text.getBytes(StandardCharsets.UTF_8));
            } catch (Exception e) {
                showToast("파일 저장에 실패했습니다.");
            }
        }

        @JavascriptInterface
        public void shareText(String text) {
            activity.runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("text/plain");
                intent.putExtra(Intent.EXTRA_TEXT, text);
                activity.startActivity(Intent.createChooser(intent, "계약서 공유"));
            });
        }

        private void saveBytes(String filename, String mimeType, byte[] bytes) throws Exception {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/한결이사");
                values.put(MediaStore.Downloads.IS_PENDING, 1);
                Uri uri = activity.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new IllegalStateException("Cannot create file");
                try (OutputStream out = activity.getContentResolver().openOutputStream(uri)) {
                    if (out == null) throw new IllegalStateException("Cannot open file");
                    out.write(bytes);
                }
                values.clear();
                values.put(MediaStore.Downloads.IS_PENDING, 0);
                activity.getContentResolver().update(uri, values, null, null);
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "한결이사");
                if (!dir.exists()) dir.mkdirs();
                File file = new File(dir, filename);
                try (FileOutputStream out = new FileOutputStream(file)) {
                    out.write(bytes);
                }
            }
            showToast("다운로드/한결이사 폴더에 저장했습니다.");
        }

        private void showToast(String message) {
            activity.runOnUiThread(() -> Toast.makeText(activity, message, Toast.LENGTH_SHORT).show());
        }
    }
}

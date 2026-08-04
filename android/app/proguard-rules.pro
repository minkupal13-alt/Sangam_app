# Keep Capacitor and Cordova WebView classes
-keep class com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep model classes
-keep class com.sangam.app.** { *; }

# Keep R classes
-keep class **.R { *; }
-keep class **.R$* { *; }

import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
    // Google Services — processes app/google-services.json so the
    // firebase_messaging runtime can find its project credentials.
    id("com.google.gms.google-services")
}

// Release signing — read from android/key.properties (gitignored) when present.
// Falls back to debug signing so the debug-signed /download builds and any
// build without the keystore still work.
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "app.getguac.getguac"
    // Override Flutter's default (34) — file_picker + flutter_plugin_android_lifecycle now need 36.
    compileSdk = 36
    ndkVersion = flutter.ndkVersion

    compileOptions {
        // Core library desugaring is required by
        // flutter_local_notifications (it uses java.time APIs that
        // need to be back-ported on older Android API levels).
        // See https://developer.android.com/studio/write/java8-support.
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "app.getguac.getguac"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            // Real upload key when android/key.properties exists (for Play
            // upload); otherwise debug keys so `flutter run --release` and the
            // sideloaded /download builds still work.
            signingConfig = if (keystorePropertiesFile.exists())
                signingConfigs.getByName("release")
            else
                signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

dependencies {
    // Pairs with isCoreLibraryDesugaringEnabled above. Pinned to
    // the minor version flutter_local_notifications 17.x expects.
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}

# ClassTrack — Flutter app (iOS + Android)

Copy this folder into a fresh Flutter project (`flutter create classtrack`), replace
`pubspec.yaml` and `lib/`, then run `flutter pub get`.

## Firebase setup

1. Create a Firebase project and add an iOS and an Android app.
2. Run `flutterfire configure` (or drop `google-services.json` into
   `android/app/` and `GoogleService-Info.plist` into `ios/Runner/`).
3. Create a Firestore collection named **students** with fields:
   `name`, `rollNo`, `lat`, `lng`, `lastSeen`, `isOnline`.
   Documents are keyed by roll number so each student has exactly one row.
4. Firestore offline persistence is on by default on mobile — writes made with
   no signal are queued and sync automatically.

## Important note on Bluetooth

`flutter_blue_plus` is a **central-only** library: it can scan, but it cannot
advertise. The student side therefore uses `flutter_ble_peripheral` to broadcast,
and the teacher side uses `flutter_blue_plus` to scan — this is the only way to
get true peer-to-peer BLE on Flutter today.

iOS additionally restricts what a backgrounded app can advertise, so keep the
student screen in the foreground during a trip for reliable discovery.

Advertised payload format: `CT|Name|RollNo` (BLE advertisements are limited to
31 bytes, so keep names short).

## Android — `android/app/src/main/AndroidManifest.xml`

Add inside `<manifest>` above `<application>`:

```xml
<!-- Bluetooth (Android 12+) -->
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

<!-- Bluetooth (Android 11 and below) -->
<uses-permission android:name="android.permission.BLUETOOTH"
    android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"
    android:maxSdkVersion="30" />

<!-- Location: required for BLE scanning and for GPS mode -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- Network for Firebase -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<uses-feature android:name="android.hardware.bluetooth_le" android:required="true" />
```

Set `minSdkVersion 23` (Firebase + BLE) in `android/app/build.gradle`.

## iOS — `ios/Runner/Info.plist`

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>ClassTrack uses Bluetooth to find students nearby when there is no internet.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>ClassTrack broadcasts your name and roll number so your teacher can find you.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>ClassTrack shares your location with your teacher during the school trip.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>ClassTrack shares your location with your teacher during the school trip.</string>
<key>UIBackgroundModes</key>
<array>
  <string>bluetooth-central</string>
  <string>bluetooth-peripheral</string>
  <string>location</string>
</array>
```

Set the iOS deployment target to 13.0 or later in `ios/Podfile`.

## Files

```
lib/main.dart                     app entry, Firebase init, permission requests
lib/screens/role_screen.dart      Student / Teacher chooser
lib/screens/student_screen.dart   name + roll, Bluetooth toggle, GPS toggle, Stop All
lib/screens/teacher_screen.dart   TabBar: Nearby (BLE) + All Students (Firestore)
lib/services/ble_service.dart     BLE advertise + scan, RSSI -> distance
lib/services/location_service.dart 30s GPS loop into Firestore
lib/services/permissions.dart     runtime permission requests
```

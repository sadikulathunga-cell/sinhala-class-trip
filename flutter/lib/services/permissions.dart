import 'package:permission_handler/permission_handler.dart';

/// Centralised runtime permission requests.
///
/// Android 12+ needs the granular bluetoothScan / bluetoothAdvertise /
/// bluetoothConnect permissions; older versions fall back to location.
/// iOS only needs Bluetooth + Location (the extra requests are no-ops).
class AppPermissions {
  static Future<void> requestAll() async {
    await [
      Permission.bluetooth,
      Permission.bluetoothScan,
      Permission.bluetoothAdvertise,
      Permission.bluetoothConnect,
      Permission.locationWhenInUse,
    ].request();
  }

  /// True when we may scan/advertise over BLE.
  static Future<bool> hasBluetooth() async {
    final scan = await Permission.bluetoothScan.status;
    final advertise = await Permission.bluetoothAdvertise.status;
    return scan.isGranted || advertise.isGranted || (await Permission.bluetooth.status).isGranted;
  }

  /// True when we may read GPS coordinates.
  static Future<bool> hasLocation() async =>
      (await Permission.locationWhenInUse.status).isGranted;
}

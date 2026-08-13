import 'dart:async';
import 'dart:math' as math;

import 'package:flutter_ble_peripheral/flutter_ble_peripheral.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

/// A student discovered over Bluetooth LE (no internet involved).
class NearbyStudent {
  NearbyStudent({
    required this.name,
    required this.rollNo,
    required this.rssi,
    required this.seenAt,
  });

  final String name;
  final String rollNo;
  final int rssi;
  final DateTime seenAt;

  /// Rough distance estimate from RSSI using the log-distance path loss model.
  /// txPower = expected RSSI at 1 m; n = environmental factor (2.0 open air).
  double get distanceMeters {
    const txPower = -59.0;
    const n = 2.0;
    return math.pow(10, (txPower - rssi) / (10 * n)).toDouble();
  }

  /// Friendly label such as "~4.2 m".
  String get distanceLabel => '~${distanceMeters.toStringAsFixed(1)} m';
}


/// Wraps BLE advertising (student) and scanning (teacher).
///
/// The advertised local name is "CT|Name|RollNo" so the teacher can decode
/// the student identity straight from the advertisement — no connection and
/// no internet required.
class BleService {
  static const String prefix = 'CT|';

  final _peripheral = FlutterBlePeripheral();
  StreamSubscription<List<ScanResult>>? _scanSub;

  /// STUDENT: start broadcasting "Name-RollNo" over BLE.
  Future<void> startBroadcast(String name, String rollNo) async {
    final data = AdvertiseData(
      // Keep it short: BLE advertisement payload is only 31 bytes.
      localName: '$prefix$name|$rollNo',
      includeDeviceName: false,
    );
    await _peripheral.start(advertiseData: data);
  }

  /// STUDENT: stop broadcasting.
  Future<void> stopBroadcast() async {
    if (await _peripheral.isAdvertising) {
      await _peripheral.stop();
    }
  }

  /// TEACHER: scan continuously and emit the live list of nearby students.
  Stream<List<NearbyStudent>> scan() {
    final controller = StreamController<List<NearbyStudent>>();
    final found = <String, NearbyStudent>{};

    FlutterBluePlus.startScan(
      continuousUpdates: true, // keep RSSI fresh while walking around
      androidScanMode: AndroidScanMode.lowLatency,
    );

    _scanSub = FlutterBluePlus.scanResults.listen((results) {
      for (final r in results) {
        final advName = r.advertisementData.advName;
        if (!advName.startsWith(prefix)) continue; // ignore non-ClassTrack devices

        final parts = advName.substring(prefix.length).split('|');
        if (parts.length < 2) continue;

        found[parts[1]] = NearbyStudent(
          name: parts[0],
          rollNo: parts[1],
          rssi: r.rssi,
          seenAt: DateTime.now(),
        );
      }

      // Drop students not seen in the last 30 seconds.
      final cutoff = DateTime.now().subtract(const Duration(seconds: 30));
      found.removeWhere((_, s) => s.seenAt.isBefore(cutoff));

      final list = found.values.toList()..sort((a, b) => b.rssi.compareTo(a.rssi));
      controller.add(list);
    });

    controller.onCancel = () async {
      await _scanSub?.cancel();
      await FlutterBluePlus.stopScan();
    };

    return controller.stream;
  }

  /// TEACHER: stop scanning.
  Future<void> stopScan() async {
    await _scanSub?.cancel();
    await FlutterBluePlus.stopScan();
  }
}

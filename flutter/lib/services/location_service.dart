import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:geolocator/geolocator.dart';

/// Pushes the student's GPS position to Firestore every 30 seconds.
///
/// Firestore's offline persistence queues writes when there is no network and
/// flushes them automatically once the device reconnects.
class LocationService {
  Timer? _timer;

  static const Duration interval = Duration(seconds: 30);

  /// Start the 30 second GPS -> Firestore loop.
  Future<void> start({
    required String name,
    required String rollNo,
    void Function(String status)? onStatus,
  }) async {
    // Make sure location services are on and permission is granted.
    if (!await Geolocator.isLocationServiceEnabled()) {
      onStatus?.call('Location services are off');
      return;
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      onStatus?.call('Location permission denied');
      return;
    }

    Future<void> push() async {
      try {
        final pos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
        );
        // Document id = rollNo, so each student has exactly one row.
        await FirebaseFirestore.instance.collection('students').doc(rollNo).set({
          'name': name,
          'rollNo': rollNo,
          'lat': pos.latitude,
          'lng': pos.longitude,
          'lastSeen': FieldValue.serverTimestamp(),
          'isOnline': true,
        }, SetOptions(merge: true));
        onStatus?.call('Sent at ${TimeOfDayString.now()}');
      } catch (e) {
        onStatus?.call('Queued offline, will sync later');
      }
    }

    await push();
    _timer = Timer.periodic(interval, (_) => push());
  }

  /// Stop the loop and flag the student as offline.
  Future<void> stop(String rollNo) async {
    _timer?.cancel();
    _timer = null;
    try {
      await FirebaseFirestore.instance
          .collection('students')
          .doc(rollNo)
          .set({'isOnline': false}, SetOptions(merge: true));
    } catch (_) {
      // Ignore: the write is queued by Firestore and syncs later.
    }
  }
}

/// Tiny helper for status text.
extension TimeOfDayString on DateTime {
  static String now() {
    final t = DateTime.now();
    return '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
  }
}

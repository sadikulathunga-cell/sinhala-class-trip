import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'screens/role_screen.dart';
import 'services/permissions.dart';

/// ClassTrack entry point.
///
/// Firebase is initialised in a try/catch on purpose: the app must still open
/// and work in pure offline (Bluetooth) mode when there is no connectivity.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Firebase.initializeApp();
    // Firestore keeps a local cache, so reads/writes still work offline and
    // sync automatically once the device is back online.
  } catch (e) {
    debugPrint('Firebase unavailable (offline mode only): $e');
  }

  // Ask for Bluetooth, Location and Nearby Devices permissions on startup.
  await AppPermissions.requestAll();

  runApp(const ClassTrackApp());
}

class ClassTrackApp extends StatelessWidget {
  const ClassTrackApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ClassTrack',
      debugShowCheckedModeBanner: false,
      // Material 3, clean and simple.
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF4F46E5)),
      ),
      home: const RoleScreen(),
    );
  }
}

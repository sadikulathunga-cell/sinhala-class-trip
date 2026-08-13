import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/ble_service.dart';
import '../services/location_service.dart';

/// Student screen: save identity, broadcast over BLE (offline) and/or
/// send GPS to Firebase every 30 seconds (online).
class StudentScreen extends StatefulWidget {
  const StudentScreen({super.key});

  @override
  State<StudentScreen> createState() => _StudentScreenState();
}

class _StudentScreenState extends State<StudentScreen> {
  final _nameCtrl = TextEditingController();
  final _rollCtrl = TextEditingController();
  final _ble = BleService();
  final _location = LocationService();

  bool _bluetoothOn = false;
  bool _gpsOn = false;
  String _status = 'Idle';

  @override
  void initState() {
    super.initState();
    _loadSaved();
  }

  /// Restore the locally saved name/rollNo (works with no internet).
  Future<void> _loadSaved() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _nameCtrl.text = prefs.getString('name') ?? '';
      _rollCtrl.text = prefs.getString('rollNo') ?? '';
    });
  }

  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('name', _nameCtrl.text.trim());
    await prefs.setString('rollNo', _rollCtrl.text.trim());
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(const SnackBar(content: Text('Details saved on this device')));
  }

  bool get _hasIdentity =>
      _nameCtrl.text.trim().isNotEmpty && _rollCtrl.text.trim().isNotEmpty;

  /// Toggle BLE advertising of "Name-RollNo".
  Future<void> _toggleBluetooth(bool value) async {
    if (!_hasIdentity) return;
    setState(() => _bluetoothOn = value);
    if (value) {
      await _ble.startBroadcast(_nameCtrl.text.trim(), _rollCtrl.text.trim());
      setState(() => _status = 'Broadcasting...');
    } else {
      await _ble.stopBroadcast();
      setState(() => _status = 'Broadcast stopped');
    }
  }

  /// Toggle the 30 second GPS -> Firestore loop.
  Future<void> _toggleGps(bool value) async {
    if (!_hasIdentity) return;
    setState(() => _gpsOn = value);
    if (value) {
      await _location.start(
        name: _nameCtrl.text.trim(),
        rollNo: _rollCtrl.text.trim(),
        onStatus: (s) => mounted ? setState(() => _status = s) : null,
      );
    } else {
      await _location.stop(_rollCtrl.text.trim());
      setState(() => _status = 'GPS stopped');
    }
  }

  /// Stop everything at once.
  Future<void> _stopAll() async {
    await _ble.stopBroadcast();
    await _location.stop(_rollCtrl.text.trim());
    setState(() {
      _bluetoothOn = false;
      _gpsOn = false;
      _status = 'Stopped';
    });
  }

  @override
  void dispose() {
    _ble.stopBroadcast();
    _nameCtrl.dispose();
    _rollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Student')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  TextField(
                    controller: _nameCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Name',
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _rollCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Roll No',
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: _hasIdentity ? _save : null,
                    icon: const Icon(Icons.save),
                    label: const Text('Save details'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: SwitchListTile(
              value: _bluetoothOn,
              onChanged: _hasIdentity ? _toggleBluetooth : null,
              title: const Text('Offline Bluetooth'),
              subtitle: const Text('Broadcasts Name-RollNo. No internet needed.'),
              secondary: const Icon(Icons.bluetooth),
            ),
          ),
          Card(
            child: SwitchListTile(
              value: _gpsOn,
              onChanged: _hasIdentity ? _toggleGps : null,
              title: const Text('Online GPS'),
              subtitle: const Text('Sends your location to Firebase every 30s.'),
              secondary: const Icon(Icons.satellite_alt),
            ),
          ),
          const SizedBox(height: 12),
          Center(child: Text(_status, style: Theme.of(context).textTheme.bodySmall)),
          const SizedBox(height: 20),
          OutlinedButton.icon(
            onPressed: _stopAll,
            icon: const Icon(Icons.stop),
            label: const Text('Stop All'),
          ),
        ],
      ),
    );
  }
}

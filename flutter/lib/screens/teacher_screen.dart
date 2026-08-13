import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../services/ble_service.dart';

/// Teacher screen with two tabs: offline Bluetooth "Nearby" and the
/// Firebase-backed "All Students" roster.
class TeacherScreen extends StatelessWidget {
  const TeacherScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Teacher'),
          bottom: const TabBar(
            tabs: [
              Tab(icon: Icon(Icons.radar), text: 'Nearby'),
              Tab(icon: Icon(Icons.groups), text: 'All Students'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [_NearbyTab(), _AllStudentsTab()],
        ),
      ),
    );
  }
}

/// TAB 1 — live BLE scan. Works with no internet.
class _NearbyTab extends StatefulWidget {
  const _NearbyTab();

  @override
  State<_NearbyTab> createState() => _NearbyTabState();
}

class _NearbyTabState extends State<_NearbyTab> {
  final _ble = BleService();
  Stream<List<NearbyStudent>>? _stream;
  String _query = '';

  void _toggleScan() {
    setState(() {
      if (_stream == null) {
        _stream = _ble.scan();
      } else {
        _ble.stopScan();
        _stream = null;
      }
    });
  }

  @override
  void dispose() {
    _ble.stopScan();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton.icon(
            onPressed: _toggleScan,
            icon: Icon(_stream == null ? Icons.play_arrow : Icons.stop),
            label: Text(_stream == null ? 'Start Scan' : 'Stop Scan'),
          ),
        ),
        _SearchField(onChanged: (v) => setState(() => _query = v)),
        Expanded(
          child: _stream == null
              ? const Center(child: Text('Tap Start Scan to find nearby students'))
              : StreamBuilder<List<NearbyStudent>>(
                  stream: _stream,
                  builder: (context, snap) {
                    final all = snap.data ?? [];
                    // Filter by name using the search bar.
                    final list = all
                        .where((s) =>
                            s.name.toLowerCase().contains(_query.toLowerCase()))
                        .toList();
                    if (list.isEmpty) {
                      return const Center(child: Text('No students in range yet'));
                    }
                    return ListView.builder(
                      itemCount: list.length,
                      itemBuilder: (_, i) {
                        final s = list[i];
                        return ListTile(
                          leading: CircleAvatar(child: Text(_initials(s.name))),
                          title: Text(s.name),
                          subtitle: Text('Roll ${s.rollNo} · RSSI ${s.rssi} dBm'),
                          trailing: Chip(label: Text(s.distanceLabel)),
                        );
                      },
                    );
                  },
                ),
        ),
      ],
    );
  }
}

/// TAB 2 — the full roster streamed live from Firestore.
class _AllStudentsTab extends StatefulWidget {
  const _AllStudentsTab();

  @override
  State<_AllStudentsTab> createState() => _AllStudentsTabState();
}

class _AllStudentsTabState extends State<_AllStudentsTab> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _SearchField(onChanged: (v) => setState(() => _query = v)),
        Expanded(
          child: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
            // Firestore serves this from its offline cache when there is no network.
            stream: FirebaseFirestore.instance
                .collection('students')
                .orderBy('lastSeen', descending: true)
                .snapshots(),
            builder: (context, snap) {
              if (snap.hasError) {
                return const Center(child: Text('Roster unavailable offline'));
              }
              if (!snap.hasData) {
                return const Center(child: CircularProgressIndicator());
              }

              final docs = snap.data!.docs.where((d) {
                final q = _query.toLowerCase();
                final data = d.data();
                return '${data['name']}'.toLowerCase().contains(q) ||
                    '${data['rollNo']}'.toLowerCase().contains(q);
              }).toList();

              if (docs.isEmpty) return const Center(child: Text('No students found'));

              return ListView.builder(
                itemCount: docs.length,
                itemBuilder: (_, i) {
                  final d = docs[i].data();
                  final online = d['isOnline'] == true;
                  final lastSeen = (d['lastSeen'] as Timestamp?)?.toDate();
                  final lat = d['lat'], lng = d['lng'];
                  return ListTile(
                    leading: CircleAvatar(child: Text(_initials('${d['name']}'))),
                    title: Text('${d['name']}'),
                    subtitle: Text(
                      'Roll ${d['rollNo']}'
                      '${lat != null ? ' · ${(lat as num).toStringAsFixed(4)}, ${(lng as num).toStringAsFixed(4)}' : ''}',
                    ),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          online ? 'Online' : 'Offline',
                          style: TextStyle(
                            color: online ? Colors.green : Colors.grey,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        Text(_ago(lastSeen),
                            style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.onChanged});

  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: TextField(
        onChanged: onChanged,
        decoration: const InputDecoration(
          prefixIcon: Icon(Icons.search),
          hintText: 'Search',
          border: OutlineInputBorder(),
          isDense: true,
        ),
      ),
    );
  }
}

String _initials(String name) {
  final parts = name.trim().split(' ').where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  return parts.take(2).map((p) => p[0].toUpperCase()).join();
}

String _ago(DateTime? time) {
  if (time == null) return '—';
  final mins = DateTime.now().difference(time).inMinutes;
  if (mins < 1) return 'just now';
  if (mins < 60) return '$mins min ago';
  final hours = mins ~/ 60;
  if (hours < 24) return '$hours h ago';
  return '${hours ~/ 24} d ago';
}

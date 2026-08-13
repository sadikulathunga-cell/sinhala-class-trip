import 'package:flutter/material.dart';

import 'student_screen.dart';
import 'teacher_screen.dart';

/// First screen: choose "Student" or "Teacher".
class RoleScreen extends StatelessWidget {
  const RoleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircleAvatar(
                  radius: 36,
                  backgroundColor: scheme.primary,
                  child: Icon(Icons.place, size: 34, color: scheme.onPrimary),
                ),
                const SizedBox(height: 16),
                Text('ClassTrack',
                    style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 6),
                Text(
                  'Keep every student accounted for — online or off.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 32),
                _RoleCard(
                  icon: Icons.school,
                  title: 'Student',
                  subtitle: 'Broadcast over Bluetooth or share GPS',
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const StudentScreen()),
                  ),
                ),
                const SizedBox(height: 12),
                _RoleCard(
                  icon: Icons.groups,
                  title: 'Teacher',
                  subtitle: 'Scan nearby students and view the roster',
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const TeacherScreen()),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        leading: CircleAvatar(child: Icon(icon)),
        title: Text(title, style: const TextStyle(fontSize: 18)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

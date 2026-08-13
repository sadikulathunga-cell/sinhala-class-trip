import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'login_page.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // PASTE YOUR SUPABASE KEYS HERE
  await Supabase.initialize(
    url: 'PASTE_YOUR_SUPABASE_URL_HERE',
    anonKey: 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE',
  );

  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Class Track',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(primarySwatch: Colors.blue),
      home: LoginPage(), // App starts with Login Page
    );
  }
}

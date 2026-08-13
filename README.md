# ClassTrack Buddy

Build a Flutter app for iOS and Android called "ClassTrack". 

It must work both OFFLINE and ONLINE.

APP FLOW:

Start with a screen to choose role: "Student" or "Teacher"

1. STUDENT SCREEN

- 2 text fields: Name and RollNo. Save them.

- Toggle "Offline Mode": When ON, broadcast Name-RollNo using Bluetooth LE with flutter_blue_plus. Show "Broadcasting..." 

- Toggle "Online Mode": When ON, get GPS location every 30 seconds and save to Firebase Firestore collection "students". Fields: name, rollNo, lat, lng, lastSeen, isOnline

- Button "Stop All"

2. TEACHER SCREEN

Use TabBar with 2 tabs.

TAB 1 "Nearby":

- Button "Start Scan" 

- Use flutter_blue_plus to scan and show live list of nearby students

- Show: Name, RollNo, and approximate distance from RSSI

- Add search bar to filter by name

TAB 2 "All Students":

- Connect to Firebase Firestore "students" collection

- Show all students in a list: Name, RollNo, Online/Offline status, Last Seen

- Add search bar

TECHNICAL:

Use these packages: flutter_blue_plus, firebase_core, cloud_firestore, geolocator, permission_handler

Ask for Bluetooth, Location, and Nearby Devices permissions on startup.

Add all required permission descriptions for iOS and Android.

UI: Use Material 3, clean and simple. Must work without internet.

Add comments in code.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://studylink-offline.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a4364ede-87ad-4620-9b70-a4ee94eca551).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

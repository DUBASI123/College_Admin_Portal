# MyVault Student Mobile App (React Native Blueprint)

This directory contains the mobile application screens built using React Native. It uses standard React Native components, Expo, and React Navigation.

## 🚀 How to Run the App

### 1. Initialize Expo Project
If you haven't initialized an Expo app yet, run:
```bash
npx create-expo-app student-mobile --template blank
```

### 2. Install Navigation & Dependencies
Navigate to your mobile directory and install these navigation and network libraries:
```bash
npm install @react-navigation/native @react-navigation/stack axios expo-secure-store lucide-react-native
npx expo install react-native-screens react-native-safe-area-context
```

### 3. Replace Screens
Copy the screens from the `screens/` directory into your project's components folder and configure the Stack navigator in your `App.js`.

### 4. Run Server
Start the Expo development server:
```bash
npx expo start
```
Use the Expo Go app on your physical iOS/Android device, or run it on an emulator.

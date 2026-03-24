import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';
import HowAreYouScreen from './screens/HowAreYouScreen';
import SettingsScreen from './screens/SettingsScreen';

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('home');

  if (!user) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLogin={(u) => { setUser(u); setScreen('home'); }} />
      </SafeAreaProvider>
    );
  }

  if (screen === 'settings') {
    return (
      <SafeAreaProvider>
        <SettingsScreen onBack={() => setScreen('home')} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <HowAreYouScreen
        user={user}
        onLogout={() => { setUser(null); setScreen('home'); }}
        onSettings={() => setScreen('settings')}
      />
    </SafeAreaProvider>
  );
}

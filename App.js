import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';
import HowAreYouScreen from './screens/HowAreYouScreen';

export default function App() {
  const [user, setUser] = useState(null);

  return (
    <SafeAreaProvider>
      {user ? (
        <HowAreYouScreen user={user} onLogout={() => setUser(null)} />
      ) : (
        <LoginScreen onLogin={setUser} />
      )}
    </SafeAreaProvider>
  );
}

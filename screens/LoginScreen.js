import { StyleSheet, Text, View, Pressable, useWindowDimensions } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = '811550455435-ho6tdh2bof2nnht9fo9lfl74nlf2rmgs.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '811550455435-sbaghribhch5aosekrlhbn5pjv1a3480.apps.googleusercontent.com';

export default function LoginScreen({ onLogin }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    scopes: [
      'openid',
      'profile',
      'email',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      fetchUserInfo(authentication.accessToken);
    }
  }, [response]);

  const fetchUserInfo = async (accessToken) => {
    const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user = await res.json();
    onLogin({ ...user, accessToken });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.heading, isDesktop && styles.headingDesktop]}>
        howareu
      </Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          isDesktop && styles.buttonDesktop,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => promptAsync()}
        disabled={!request}
      >
        <Text style={styles.buttonText}>Sign in with Google</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  heading: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  headingDesktop: {
    fontSize: 48,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonDesktop: {
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

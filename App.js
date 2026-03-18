import { StyleSheet, Text, View, useWindowDimensions, Platform } from 'react-native';

export default function App() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <View style={styles.container}>
      <Text style={[styles.heading, isDesktop && styles.headingDesktop]}>
        Hello, World!
      </Text>
      <Text style={[styles.subtitle, isDesktop && styles.subtitleDesktop]}>
        Running on {Platform.OS === 'web' ? 'macOS (Web)' : Platform.OS}
      </Text>
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
  },
  subtitleDesktop: {
    fontSize: 20,
  },
});

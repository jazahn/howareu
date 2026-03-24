import { StyleSheet, Text, View, Image, Pressable, useWindowDimensions } from 'react-native';

export default function ProfileScreen({ user, onLogout }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <View style={styles.container}>
      {user.picture && (
        <Image source={{ uri: user.picture }} style={styles.avatar} />
      )}
      <Text style={[styles.heading, isDesktop && styles.headingDesktop]}>
        {user.name}
      </Text>
      <View style={styles.infoCard}>
        <InfoRow label="Email" value={user.email} />
        {user.given_name && <InfoRow label="First name" value={user.given_name} />}
        {user.family_name && <InfoRow label="Last name" value={user.family_name} />}
        {user.locale && <InfoRow label="Locale" value={user.locale} />}
        <InfoRow label="Verified" value={user.verified_email ? 'Yes' : 'No'} />
      </View>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={onLogout}
      >
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
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
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  headingDesktop: {
    fontSize: 36,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});

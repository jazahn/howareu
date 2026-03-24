import { StyleSheet, Text, View, Pressable, Switch, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const STORAGE_KEY = 'howareu_notification_settings';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function requestPermissions() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleDailyNotification(hour, minute) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'howareu',
      body: 'Time to check in! How are you feeling?',
    },
    trigger: {
      type: 'daily',
      hour,
      minute,
    },
  });
}

async function cancelNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

function formatTime(date) {
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m} ${ampm}`;
}

export default function SettingsScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) {
        const settings = JSON.parse(val);
        setEnabled(settings.enabled);
        const d = new Date();
        d.setHours(settings.hour, settings.minute, 0, 0);
        setTime(d);
      }
      setLoaded(true);
    });
  }, []);

  const save = useCallback(async (newEnabled, newTime) => {
    const hour = newTime.getHours();
    const minute = newTime.getMinutes();
    const settings = { enabled: newEnabled, hour, minute };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    if (newEnabled) {
      const granted = await requestPermissions();
      if (granted) {
        await scheduleDailyNotification(hour, minute);
      } else {
        setEnabled(false);
        settings.enabled = false;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      }
    } else {
      await cancelNotifications();
    }
  }, []);

  const handleToggle = (val) => {
    setEnabled(val);
    save(val, time);
  };

  const handleTimeChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      setTime(selectedDate);
      save(enabled, selectedDate);
    }
  };

  if (!loaded) return null;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Daily Reminder</Text>
          <Text style={styles.sectionDesc}>
            Get a notification to check in with yourself
          </Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Enable reminder</Text>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ true: '#4285F4' }}
            />
          </View>

          {enabled && (
            <Pressable style={styles.row} onPress={() => setShowPicker(true)}>
              <Text style={styles.rowLabel}>Reminder time</Text>
              <Text style={styles.rowValue}>{formatTime(time)}</Text>
            </Pressable>
          )}

          {showPicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display="spinner"
              onChange={handleTimeChange}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: 16,
    color: '#4285F4',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  rowLabel: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  rowValue: {
    fontSize: 16,
    color: '#4285F4',
    fontWeight: '600',
  },
});

import { StyleSheet, Text, View, Pressable, ActivityIndicator, ScrollView, Image, Modal } from 'react-native';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HOW_ANSWERS = ['good', 'eh', 'bad'];

const HOW_COLORS = {
  good: '#4CAF50',
  eh: '#FF9800',
  bad: '#F44336',
};

const GREETINGS = [
  'hey', 'hi', 'good to see you', 'welcome back', 'howdy',
  'what\'s up', 'hello there', 'glad you\'re here',
];

const ALL_FEELINGS = [
  'happy', 'sad', 'anxious', 'calm', 'excited',
  'frustrated', 'grateful', 'lonely', 'hopeful', 'overwhelmed',
  'content', 'angry', 'confused', 'proud', 'nervous',
  'peaceful', 'restless', 'inspired', 'bored', 'nostalgic',
  'jealous', 'amused', 'guilty', 'relieved', 'curious',
];

const HEADER_COLOR = '#5B9BD5';

function pickRandom(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomGreeting() {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
}

function formatDate(isoString) {
  const d = new Date(isoString);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const hour = d.getHours();
  const min = d.getMinutes().toString().padStart(2, '0');
  const ampm = hour >= 12 ? 'pm' : 'am';
  const h = hour % 12 || 12;
  return `${month} ${day}, ${h}:${min}${ampm}`;
}

// --- Google Drive/Sheets helpers ---

class SessionExpiredError extends Error {
  constructor() { super('Session expired'); this.name = 'SessionExpiredError'; }
}

async function authFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 401) throw new SessionExpiredError();
  return res;
}

async function findOrCreateFolder(accessToken) {
  const searchRes = await authFetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      "name='howareu' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    )}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) return searchData.files[0].id;

  const createRes = await authFetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'howareu', mimeType: 'application/vnd.google-apps.folder' }),
  });
  return (await createRes.json()).id;
}

async function findOrCreateSheet(accessToken, folderId) {
  const searchRes = await authFetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `name='data' and '${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
    )}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) return searchData.files[0].id;

  const createRes = await authFetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title: 'data' },
      sheets: [{
        properties: { title: 'responses' },
        data: [{
          startRow: 0, startColumn: 0,
          rowData: [{ values: [
            { userEnteredValue: { stringValue: 'timestamp' } },
            { userEnteredValue: { stringValue: 'how' } },
            { userEnteredValue: { stringValue: 'feelings' } },
          ]}],
        }],
      }],
    }),
  });
  const sheet = await createRes.json();
  await authFetch(
    `https://www.googleapis.com/drive/v3/files/${sheet.spreadsheetId}?addParents=${folderId}&fields=id`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return sheet.spreadsheetId;
}

async function recordResponse(accessToken, spreadsheetId, howAnswer, feelings) {
  const timestamp = new Date().toISOString();
  await authFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/responses:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [[timestamp, howAnswer, feelings.join(', ')]] }),
    }
  );
}

async function fetchRecentRows(accessToken) {
  try {
    const folderId = await findOrCreateFolder(accessToken);
    const spreadsheetId = await findOrCreateSheet(accessToken, folderId);
    const res = await authFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/responses?majorDimension=ROWS`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await res.json();
    const rows = data.values || [];
    return rows.slice(1).slice(-7);
  } catch (e) {
    if (e instanceof SessionExpiredError) throw e;
    return [];
  }
}

// --- Components ---

function AppHeader({ user, onLogout, onSettings }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.headerTitle}>HowAreU</Text>

      <Pressable style={styles.hamburger} onPress={() => setMenuOpen(true)}>
        <View style={styles.hamburgerLine} />
        <View style={styles.hamburgerLine} />
        <View style={styles.hamburgerLine} />
      </Pressable>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menuDropdown, { top: insets.top + 12 }]}>
            <View style={styles.menuUserRow}>
              {user.picture ? (
                <Image source={{ uri: user.picture }} style={styles.menuAvatar} />
              ) : (
                <View style={[styles.menuAvatar, styles.menuAvatarPlaceholder]}>
                  <Text style={styles.menuAvatarLetter}>{(user.name || '?')[0]}</Text>
                </View>
              )}
              <View style={styles.menuUserInfo}>
                <Text style={styles.menuUserName} numberOfLines={1}>{user.name}</Text>
                <Text style={styles.menuUserEmail} numberOfLines={1}>{user.email}</Text>
              </View>
            </View>
            <View style={styles.menuDivider} />
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: '#f0f0f0' }]}
              onPress={() => { setMenuOpen(false); onSettings(); }}
            >
              <Text style={styles.menuItemText}>Settings</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: '#f0f0f0' }]}
              onPress={() => { setMenuOpen(false); onLogout(); }}
            >
              <Text style={styles.menuItemText}>Sign out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function HistoryTable({ rows }) {
  if (rows.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>no check-ins yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, styles.dateCol]}>date</Text>
        <Text style={[styles.tableHeaderCell, styles.howCol]}>how</Text>
        <Text style={[styles.tableHeaderCell, styles.feelingsCol]}>feelings</Text>
      </View>
      {rows.map((row, i) => (
        <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
          <Text style={[styles.tableCell, styles.dateCol]}>{formatDate(row[0])}</Text>
          <Text style={[styles.tableCell, styles.howCol, { color: HOW_COLORS[row[1]] || '#1a1a1a', fontWeight: '600' }]}>{row[1]}</Text>
          <Text style={[styles.tableCell, styles.feelingsCol]}>{row[2] || ''}</Text>
        </View>
      ))}
    </View>
  );
}

// --- Main Screen ---

export default function HowAreYouScreen({ user, onLogout, onSettings }) {
  const [step, setStep] = useState('home'); // 'home' | 'how' | 'feelings' | 'submitting'
  const [howAnswer, setHowAnswer] = useState(null);
  const [feelingOptions, setFeelingOptions] = useState(() => pickRandom(ALL_FEELINGS, 5));
  const [selectedFeelings, setSelectedFeelings] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [greeting] = useState(() => randomGreeting());

  const handleSessionExpired = useCallback(() => {
    console.log('Session expired, redirecting to login');
    onLogout();
  }, [onLogout]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const rows = await fetchRecentRows(user.accessToken);
      setHistory(rows);
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      console.error('Failed to load history:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, [user.accessToken, handleSessionExpired]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const refreshFeelings = useCallback(() => {
    setFeelingOptions(pickRandom(ALL_FEELINGS, 5));
    setSelectedFeelings([]);
  }, []);

  const toggleFeeling = (feeling) => {
    setSelectedFeelings((prev) =>
      prev.includes(feeling) ? prev.filter((f) => f !== feeling) : [...prev, feeling]
    );
  };

  const handleHowAnswer = (answer) => {
    setHowAnswer(answer);
    setStep('feelings');
  };

  const handleSubmit = async () => {
    setStep('submitting');
    try {
      const folderId = await findOrCreateFolder(user.accessToken);
      const spreadsheetId = await findOrCreateSheet(user.accessToken, folderId);
      await recordResponse(user.accessToken, spreadsheetId, howAnswer, selectedFeelings);
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
      console.error('Failed to record response:', e);
    }
    setHowAnswer(null);
    setSelectedFeelings([]);
    setFeelingOptions(pickRandom(ALL_FEELINGS, 5));
    try {
      await loadHistory();
    } catch (e) {
      if (e instanceof SessionExpiredError) return handleSessionExpired();
    }
    setStep('home');
  };

  // --- home ---
  if (step === 'home') {
    return (
      <View style={styles.screen}>
        <AppHeader user={user} onLogout={onLogout} onSettings={onSettings} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.greetingHome}>{greeting}, {user.given_name || user.name}</Text>

          <Pressable
            style={({ pressed }) => [styles.startButton, pressed && styles.buttonPressed]}
            onPress={() => setStep('how')}
          >
            <Text style={styles.startButtonText}>How are you?</Text>
          </Pressable>

          <View style={styles.historySection}>
            <Text style={styles.historyHeading}>recent check-ins</Text>
            {loadingHistory ? (
              <ActivityIndicator size="small" color="#4285F4" style={{ marginTop: 16 }} />
            ) : (
              <HistoryTable rows={history} />
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- submitting ---
  if (step === 'submitting') {
    return (
      <View style={styles.screen}>
        <AppHeader user={user} onLogout={onLogout} onSettings={onSettings} />
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={[styles.subtitle, { marginTop: 16 }]}>recording...</Text>
        </View>
      </View>
    );
  }

  // --- feelings ---
  if (step === 'feelings') {
    return (
      <View style={styles.screen}>
        <AppHeader user={user} onLogout={onLogout} onSettings={onSettings} />
        <View style={styles.centeredContent}>
          <Text style={styles.greeting}>
            you said <Text style={{ fontWeight: '700', color: HOW_COLORS[howAnswer] }}>{howAnswer}</Text>
          </Text>
          <Text style={styles.questionHeading}>what are you feeling?</Text>

          <View style={styles.feelingsWrap}>
            {feelingOptions.map((feeling) => {
              const selected = selectedFeelings.includes(feeling);
              return (
                <Pressable
                  key={feeling}
                  style={[styles.feelingChip, selected && styles.feelingChipSelected]}
                  onPress={() => toggleFeeling(feeling)}
                >
                  <Text style={[styles.feelingText, selected && styles.feelingTextSelected]}>
                    {feeling}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.refreshButton} onPress={refreshFeelings}>
            <Text style={styles.refreshText}>refresh</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.submitButton,
              selectedFeelings.length === 0 && styles.submitButtonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleSubmit}
            disabled={selectedFeelings.length === 0}
          >
            <Text style={styles.buttonText}>submit</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // --- how ---
  return (
    <View style={styles.screen}>
      <AppHeader user={user} onLogout={onLogout} onSettings={onSettings} />
      <View style={styles.centeredContent}>
        <Text style={styles.greeting}>{greeting}, {user.given_name || user.name}</Text>
        <Text style={styles.questionHeading}>how are you?</Text>

        <View style={styles.answers}>
          {HOW_ANSWERS.map((answer) => (
            <Pressable
              key={answer}
              style={({ pressed }) => [
                styles.answerButton,
                { backgroundColor: HOW_COLORS[answer] },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => handleHowAnswer(answer)}
            >
              <Text style={styles.answerText}>{answer}</Text>
            </Pressable>
          ))}
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
    backgroundColor: HEADER_COLOR,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  hamburger: {
    padding: 10,
    gap: 5,
  },
  hamburgerLine: {
    width: 24,
    height: 2.5,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  scrollContent: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 24,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menuDropdown: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  menuUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  menuAvatarPlaceholder: {
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuAvatarLetter: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  menuUserInfo: {
    flex: 1,
  },
  menuUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  menuUserEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e0e0e0',
  },
  menuItem: {
    padding: 16,
  },
  menuItemText: {
    fontSize: 15,
    color: '#333',
  },
  greetingHome: {
    fontSize: 20,
    color: '#666',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  questionHeading: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  historySection: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'stretch',
  },
  historyHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    marginTop: 8,
  },
  startButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 32,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  answers: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
    marginBottom: 48,
  },
  answerButton: {
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  answerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  feelingsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 24,
    marginBottom: 16,
    justifyContent: 'center',
    maxWidth: 360,
  },
  feelingChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  feelingChipSelected: {
    backgroundColor: '#4285F4',
  },
  feelingText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  feelingTextSelected: {
    color: '#fff',
  },
  refreshButton: {
    marginBottom: 24,
    padding: 8,
  },
  refreshText: {
    fontSize: 14,
    color: '#4285F4',
    fontWeight: '600',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: '#4285F4',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
  },
  table: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeaderCell: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  tableRowEven: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  dateCol: {
    width: 110,
  },
  howCol: {
    width: 50,
  },
  feelingsCol: {
    flex: 1,
  },
});
